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

  // Generate content type maps for multi-content-type support
  const contentTypeMaps = generateContentTypeMaps(operation);
  contentTypeMaps.typeImports.forEach((imp) => typeImports.add(imp));

  // Always generate type maps if we have request body or responses
  const shouldGenerateRequestMap = hasBody && contentTypeMaps.requestContentTypeCount > 0;
  const shouldGenerateResponseMap = contentTypeMaps.responseContentTypeCount > 0;

  // Build parameter interface
  let paramsInterface = buildParameterInterface(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    shouldGenerateRequestMap ? requestMapTypeName : undefined,
    shouldGenerateResponseMap ? responseMapTypeName : undefined,
  );

  // Build destructured parameters for function signature
  const destructuredParams = buildDestructuredParameters(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    shouldGenerateRequestMap,
    shouldGenerateResponseMap,
  );

  // Generate response handlers and return type
  const { responseHandlers, returnType } = generateResponseHandlers(
    operation,
    typeImports,
  );

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
    shouldGenerateRequestMap,
    shouldGenerateResponseMap,
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
  let updatedReturnType = returnType;

  if (shouldGenerateRequestMap || shouldGenerateResponseMap) {
    const genericParts: string[] = [];
    
    if (shouldGenerateRequestMap) {
      const defaultReq = contentTypeMaps.defaultRequestContentType || "application/json";
      genericParts.push(`TRequestContentType extends keyof ${requestMapTypeName} = "${defaultReq}"`);
    }
    
    if (shouldGenerateResponseMap) {
      const defaultResp = contentTypeMaps.defaultResponseContentType || "application/json";
      genericParts.push(`TResponseContentType extends keyof ${responseMapTypeName} = "${defaultResp}"`);
    }
    
    if (genericParts.length > 0) {
      genericParams = `<${genericParts.join(", ")}>`;
      
      // Update return type to use generic
      if (shouldGenerateResponseMap) {
        updatedReturnType = `${responseMapTypeName}[TResponseContentType]`;
      }
    }
  }

  // Generate type aliases - always generate them if we have content types
  let typeAliases = "";
  if (shouldGenerateRequestMap) {
    typeAliases += `export type ${requestMapTypeName} = ${contentTypeMaps.requestMapType};\n\n`;
  }
  if (shouldGenerateResponseMap) {
    typeAliases += `export type ${responseMapTypeName} = ${contentTypeMaps.responseMapType};\n\n`;
  }

  const functionStr = `${typeAliases}${summary}export async function ${functionName}${genericParams}(
  ${parameterDeclaration},
  config: GlobalConfig = globalConfig
): Promise<${updatedReturnType}> {
  ${functionBodyCode}
}`;

  return { functionCode: functionStr, typeImports };
}
