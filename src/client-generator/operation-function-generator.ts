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
import {
  generateContentTypeMaps,
  generateResponseHandlers,
} from "./responses.js";
import {
  extractAuthHeaders,
  getOperationSecuritySchemes,
  hasSecurityOverride,
} from "./security.js";

/* Result of generating a function with imports */
export type GeneratedFunction = {
  functionCode: string;
  typeImports: Set<string>;
};

/**
 * generateOperationFunction
 * High-level orchestrator that assembles the full source code string for a single
 * OpenAPI operation. Steps:
 * 1. Derive naming (sanitized operationId -> function + type map names)
 * 2. Extract grouped parameters + security metadata
 * 3. Resolve body + (request/response) content-type map metadata
 * 4. Build parameter destructuring + parameter interface shapes
 * 5. Build response handlers & union return type
 * 6. Compute generics (<TRequestContentType, TResponseContentType>) when maps exist
 * 7. Emit type map aliases, function signature & body (calling code-generation for internals)
 * Returns the generated code and the set of type imports required by the operation.
 * NOTE: The produced code references GlobalConfig/globalConfig which are emitted by the config generator, not imported here.
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
  const operationName =
    functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const typeImports = new Set<string>();

  // Extract parameters & security
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );
  const hasBody = !!operation.requestBody;
  const operationSecurityHeaders = getOperationSecuritySchemes(operation, doc);

  // Body & content type meta
  // Collect body related type info + request/response content-type maps (if any)
  const bodyInfo = collectBodyAndContentTypes(
    hasBody,
    operation,
    functionName,
    typeImports,
    operationName,
  );

  // Build parameter shapes
  // Build the "first parameter" surface: destructured runtime parameter object + its TS interface
  const { destructuredParams, paramsInterface } = buildParameterStructures(
    parameterGroups,
    hasBody,
    bodyInfo.bodyTypeInfo,
    operationSecurityHeaders,
    bodyInfo.shouldGenerateRequestMap,
    bodyInfo.shouldGenerateResponseMap,
    bodyInfo.requestMapTypeName,
    bodyInfo.responseMapTypeName,
  );

  // Responses & union return type
  // Build response handlers + discriminated union return type (ApiResponse<code, Data>)
  const { responseHandlers, returnType } = generateResponseHandlers(
    operation,
    typeImports,
    bodyInfo.shouldGenerateResponseMap,
  );

  // Security overrides/auth headers
  const overridesSecurity = hasSecurityOverride(operation);
  const authHeaders = extractAuthHeaders(doc);

  // Function internal body code
  // Assemble the inner imperative body (headers, fetch call, switch over request content-type, parsing)
  const functionBodyCode = generateFunctionBody({
    authHeaders,
    contentTypeMaps: bodyInfo.contentTypeMaps,
    hasBody,
    method,
    operationSecurityHeaders,
    overridesSecurity,
    parameterGroups,
    pathKey,
    requestContentTypes: bodyInfo.requestContentTypes,
    responseHandlers,
    shouldGenerateRequestMap: bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: bodyInfo.shouldGenerateResponseMap,
  });

  const parameterDeclaration = buildParameterDeclaration(
    destructuredParams,
    paramsInterface,
  );

  // Compute generic parameters and adjust return type if response map present
  const { genericParams, updatedReturnType } = buildGenericParams(
    bodyInfo.shouldGenerateRequestMap,
    bodyInfo.shouldGenerateResponseMap,
    bodyInfo.contentTypeMaps,
    bodyInfo.requestMapTypeName,
    bodyInfo.responseMapTypeName,
    returnType,
  );

  // Emit request/response map type aliases (only when non-empty / applicable)
  const typeAliases = buildTypeAliases(
    bodyInfo.shouldGenerateRequestMap,
    bodyInfo.shouldGenerateResponseMap,
    bodyInfo.requestMapTypeName,
    bodyInfo.responseMapTypeName,
    bodyInfo.contentTypeMaps,
  );

  const functionStr = `${typeAliases}${summary}export async function ${functionName}${genericParams}(
  ${parameterDeclaration},
  config: GlobalConfig = globalConfig
): Promise<${updatedReturnType}> {
  ${functionBodyCode}
}`;

  return { functionCode: functionStr, typeImports };
}

// ---------------- Helper extraction functions (kept local to module) ----------------

/**
 * buildGenericParams
 * Creates generic parameter list for request/response content-type selection.
 * Example output: <TRequestContentType extends keyof MyOpRequestMap = "application/json", TResponseContentType extends keyof MyOpResponseMap = "application/json">
 * Returns both the generic parameter string and the adjusted return type (map lookup when response map present).
 */
function buildGenericParams(
  shouldGenerateRequestMap: boolean,
  shouldGenerateResponseMap: boolean,
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>,
  requestMapTypeName: string,
  responseMapTypeName: string,
  initialReturnType: string,
) {
  let genericParams = "";
  let updatedReturnType = initialReturnType;

  if (shouldGenerateRequestMap || shouldGenerateResponseMap) {
    const genericParts: string[] = [];
    if (shouldGenerateRequestMap) {
      const defaultReq =
        contentTypeMaps.defaultRequestContentType || "application/json";
      genericParts.push(
        `TRequestContentType extends keyof ${requestMapTypeName} = "${defaultReq}"`,
      );
    }
    if (shouldGenerateResponseMap) {
      const defaultResp =
        contentTypeMaps.defaultResponseContentType || "application/json";
      genericParts.push(
        `TResponseContentType extends keyof ${responseMapTypeName} = "${defaultResp}"`,
      );
    }
    if (genericParts.length > 0) {
      genericParams = `<${genericParts.join(", ")}>`;
      if (shouldGenerateResponseMap) {
        updatedReturnType = `${responseMapTypeName}[TResponseContentType]`;
      }
    }
  }
  return { genericParams, updatedReturnType };
}

/**
 * buildParameterDeclaration
 * Produces the function's first parameter declaration.
 * Special case: empty destructuring + empty interface => provide default {} to keep valid signature.
 */
function buildParameterDeclaration(
  destructuredParams: string,
  paramsInterface: string,
) {
  if (destructuredParams === "{}" && paramsInterface === "{}") {
    return "{}: {} = {}";
  }
  return `${destructuredParams}: ${paramsInterface}`;
}

/**
 * buildParameterStructures
 * Returns both: (1) destructured parameter object used in the function signature, (2) its interface type.
 * Injects generic request/response map references if those maps exist.
 */
function buildParameterStructures(
  parameterGroups: ReturnType<typeof extractParameterGroups>,
  hasBody: boolean,
  bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined,
  operationSecurityHeaders: ReturnType<typeof getOperationSecuritySchemes>,
  shouldGenerateRequestMap: boolean,
  shouldGenerateResponseMap: boolean,
  requestMapTypeName: string,
  responseMapTypeName: string,
) {
  const destructuredParams = buildDestructuredParameters(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    shouldGenerateRequestMap,
    shouldGenerateResponseMap,
  );

  const paramsInterface = buildParameterInterface(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    shouldGenerateRequestMap ? requestMapTypeName : undefined,
    shouldGenerateResponseMap ? responseMapTypeName : undefined,
  );

  return { destructuredParams, paramsInterface };
}

/**
 * buildTypeAliases
 * Emits exported request/response content-type map aliases.
 * Skips each side when no map required (empty object or no body for request).
 */
function buildTypeAliases(
  shouldGenerateRequestMap: boolean,
  shouldGenerateResponseMap: boolean,
  requestMapTypeName: string,
  responseMapTypeName: string,
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>,
) {
  let typeAliases = "";
  if (shouldGenerateRequestMap) {
    typeAliases += `export type ${requestMapTypeName} = ${contentTypeMaps.requestMapType};\n\n`;
  }
  // Always emit response map type alias for stability; if empty map that's fine
  if (shouldGenerateResponseMap || contentTypeMaps.responseMapType) {
    typeAliases += `export type ${responseMapTypeName} = ${contentTypeMaps.responseMapType || "{}"};\n\n`;
  }
  return typeAliases;
}

/**
 * collectBodyAndContentTypes
 * Gathers request body type info, enumerates request content types, and builds the request & response map metadata.
 * shouldGenerateRequestMap: only true when a body exists AND the generated request map isn't an empty {}.
 * shouldGenerateResponseMap: true when response map has entries (non-empty {}).
 * Returns an object with everything needed downstream (maps, defaults, flags, imports augmented).
 */
function collectBodyAndContentTypes(
  hasBody: boolean,
  operation: OperationObject,
  functionName: string,
  typeImports: Set<string>,
  operationName: string,
) {
  let bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined;
  let requestContentType: string | undefined;

  if (hasBody) {
    const requestBody = operation.requestBody as RequestBodyObject;
    bodyTypeInfo = resolveRequestBodyType(requestBody, functionName);
    requestContentType = bodyTypeInfo.contentType;
    bodyTypeInfo.typeImports.forEach((imp) => typeImports.add(imp));
  }

  const requestMapTypeName = `${operationName}RequestMap`;
  const responseMapTypeName = `${operationName}ResponseMap`;

  const contentTypeMaps = generateContentTypeMaps(operation);
  contentTypeMaps.typeImports.forEach((imp) => typeImports.add(imp));

  let requestContentTypes: string[] = [];
  if (hasBody && (operation.requestBody as RequestBodyObject)?.content) {
    requestContentTypes = Object.keys(
      (operation.requestBody as RequestBodyObject).content,
    );
  }

  // Request map only meaningful when there is a body and at least one content-type mapping generated.
  const shouldGenerateRequestMap =
    hasBody &&
    !!contentTypeMaps.requestMapType &&
    contentTypeMaps.requestMapType !== "{}";
  // A response map of '{}' means the operation has no concrete response content-type mappings.
  // In that case we must NOT generate response content-type generics or attempt indexed lookup.
  // (Previously this produced: TResponseContentType extends keyof {} = "application/json" -> error)
  const shouldGenerateResponseMap =
    !!contentTypeMaps.responseMapType &&
    contentTypeMaps.responseMapType !== "{}";

  return {
    bodyTypeInfo,
    contentTypeMaps,
    requestContentType,
    requestContentTypes,
    requestMapTypeName,
    responseMapTypeName,
    shouldGenerateRequestMap,
    shouldGenerateResponseMap,
  };
}
