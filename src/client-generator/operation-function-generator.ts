import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
} from "openapi3-ts/oas31";

import assert from "assert";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateFunctionBody } from "./code-generation.js";
import { extractParameterGroups } from "./parameters.js";
import {
  buildDestructuredParameters,
  buildParameterInterface,
} from "./parameters.js";
import { resolveRequestBodyType } from "./request-body.js";
import { generateResponseHandlers, generateContentTypeMaps } from "./responses.js";
import {
  extractAuthHeaders,
  getOperationSecuritySchemes,
  hasSecurityOverride,
} from "./security.js";

/**
 * Result of generating a function with imports
 */
export type GeneratedFunction = {
  functionCode: string;
  typeImports: Set<string>;
};

/**
 * Generates a single operation function
 * Returns: { functionCode: string, typeImports: Set<string> }
 */
export function generateOperationFunction(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): GeneratedFunction {
  assert(operation.operationId, "Operation ID is required");
  const functionName: string = sanitizeIdentifier(operation.operationId);
  const operationName = functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const typeImports = new Set<string>();

  // Extract parameter groups
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );
  const hasBody = !!operation.requestBody;

  // Get operation-specific security headers
  const operationSecurityHeaders = getOperationSecuritySchemes(operation, doc);

  // Build parameter interface
  let bodyTypeInfo;
  let requestContentType: string | undefined;

  if (hasBody) {
    const requestBody = operation.requestBody as RequestBodyObject;
    bodyTypeInfo = resolveRequestBodyType(requestBody, functionName);
    requestContentType = bodyTypeInfo.contentType;
    bodyTypeInfo.typeImports.forEach((imp) => typeImports.add(imp));
  }

  // Generate type aliases for content type maps
  const requestMapTypeName = `${operationName}RequestMap`;
  const responseMapTypeName = `${operationName}ResponseMap`;

  // Build parameter interface for types (will be updated later if needed)
  let paramsInterface = buildParameterInterface(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
  );

  // Build destructured parameters for function signature
  const destructuredParams = buildDestructuredParameters(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
  );

  // Generate response handlers and return type
  const { responseHandlers, returnType } = generateResponseHandlers(
    operation,
    typeImports,
  );

  // Generate content type maps for multi-content-type support
  const contentTypeMaps = generateContentTypeMaps(operation);
  contentTypeMaps.typeImports.forEach((imp) => typeImports.add(imp));

  // Check if we have multiple content types to generate generic signatures
  const hasMultipleRequestTypes = contentTypeMaps.requestContentTypeCount > 1;
  const hasMultipleResponseTypes = contentTypeMaps.responseContentTypeCount > 1;

  // Update parameter interface to use generic body type if multiple request types exist
  if (hasMultipleRequestTypes && hasBody && bodyTypeInfo?.typeName) {
    // Replace the specific body type with the generic type
    const bodyTypePattern = new RegExp(`body(\\??): ${bodyTypeInfo.typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    paramsInterface = paramsInterface.replace(bodyTypePattern, `body$1: ${requestMapTypeName}[TRequestContentType]`);
  }

  // Check if operation overrides security (empty or specific schemes)
  const overridesSecurity = hasSecurityOverride(operation);
  const authHeaders = extractAuthHeaders(doc);

  // Generate function body with content type information
  const functionBodyCode = generateFunctionBody(
    pathKey,
    method,
    parameterGroups,
    hasBody,
    responseHandlers,
    requestContentType,
    operationSecurityHeaders,
    overridesSecurity,
    authHeaders,
    contentTypeMaps,
  );

  // Handle empty parameters case - use simple destructuring with default
  let parameterDeclaration;

  if (destructuredParams === "{}" && paramsInterface === "{}") {
    // For functions with no parameters, use simple empty object destructuring with default
    parameterDeclaration = "{}: {} = {}";
  } else {
    parameterDeclaration = `${destructuredParams}: ${paramsInterface}`;
  }

  // Generate generic type parameters and defaults
  let genericParams = "";
  let optionsParam = "";
  let updatedReturnType = returnType;

  if (hasMultipleRequestTypes || hasMultipleResponseTypes) {
    const genericParts: string[] = [];
    
    if (hasMultipleRequestTypes) {
      const defaultReq = contentTypeMaps.defaultRequestContentType || "application/json";
      genericParts.push(`TRequestContentType extends keyof ${requestMapTypeName} = "${defaultReq}"`);
    }
    
    if (hasMultipleResponseTypes) {
      const defaultResp = contentTypeMaps.defaultResponseContentType || "application/json";
      genericParts.push(`TResponseContentType extends keyof ${responseMapTypeName} = "${defaultResp}"`);
    }
    
    if (genericParts.length > 0) {
      genericParams = `<${genericParts.join(", ")}>`;
      
      // Add options parameter for content types
      const optionsParts: string[] = [];
      if (hasMultipleRequestTypes) {
        optionsParts.push("requestContentType?: TRequestContentType");
      }
      if (hasMultipleResponseTypes) {
        optionsParts.push("responseContentType?: TResponseContentType");
      }
      
      optionsParam = `,\n  options?: { ${optionsParts.join("; ")} }`;
      
      // Update return type to use generic
      if (hasMultipleResponseTypes) {
        updatedReturnType = `${responseMapTypeName}[TResponseContentType]`;
      }
      
      // Update parameter interface for request body if needed
      if (hasMultipleRequestTypes && hasBody) {
        // We'll need to modify the params interface to use the generic type
        // For now, keep the existing approach but note this needs enhancement
      }
    }
  }

  // Generate type aliases
  let typeAliases = "";
  if (hasMultipleRequestTypes) {
    typeAliases += `export type ${requestMapTypeName} = ${contentTypeMaps.requestMapType};\n\n`;
  }
  if (hasMultipleResponseTypes) {
    typeAliases += `export type ${responseMapTypeName} = ${contentTypeMaps.responseMapType};\n\n`;
  }

  const functionStr = `${typeAliases}${summary}export async function ${functionName}${genericParams}(
  ${parameterDeclaration}${optionsParam},
  config: GlobalConfig = globalConfig
): Promise<${updatedReturnType}> {
  ${functionBodyCode}
}`;

  return { functionCode: functionStr, typeImports };
}
