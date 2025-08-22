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
import { generateResponseHandlers } from "./responses.js";
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

  // Build parameter interface for types
  const paramsInterface = buildParameterInterface(
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
  );

  // Handle empty parameters case - use simple destructuring with default
  let parameterDeclaration;

  if (destructuredParams === "{}" && paramsInterface === "{}") {
    // For functions with no parameters, use simple empty object destructuring with default
    parameterDeclaration = "{}: {} = {}";
  } else {
    parameterDeclaration = `${destructuredParams}: ${paramsInterface}`;
  }

  const functionStr = `${summary}export async function ${functionName}(
  ${parameterDeclaration},
  config: GlobalConfig = globalConfig
): Promise<${returnType}> {
  ${functionBodyCode}
}`;

  return { functionCode: functionStr, typeImports };
}
