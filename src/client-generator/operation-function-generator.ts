import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
} from "openapi3-ts/oas31";

import assert from "assert";

import type { OperationMetadata } from "./templates/operation-templates.js";

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
import {
  buildGenericParams,
  buildParameterDeclaration,
  buildTypeAliases,
  renderOperationFunction,
} from "./templates/operation-templates.js";

/* Result of generating a function with imports */
export interface GeneratedFunction {
  functionCode: string;
  typeImports: Set<string>;
}

/**
 * extractOperationMetadata
 * Pure function that extracts and assembles all metadata needed for generating an operation function.
 * This function focuses solely on business logic and data extraction without any code rendering.
 * Returns structured data that can be passed to rendering functions.
 */
export function extractOperationMetadata(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
  forceValidation = false,
): OperationMetadata {
  assert(operation.operationId, "Operation ID is required");
  const functionName: string = sanitizeIdentifier(operation.operationId);
  const operationName =
    functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const typeImports = new Set<string>();

  /* Extract parameters & security */
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );
  const hasBody = !!operation.requestBody;
  const operationSecurityHeaders = getOperationSecuritySchemes(operation, doc);

  /* Body & content type meta */
  /* Collect body related type info + request/response content-type maps (if any) */
  const bodyInfo = collectBodyAndContentTypes(
    hasBody,
    operation,
    functionName,
    typeImports,
    operationName,
  );

  /* Build parameter shapes */
  /* Build the "first parameter" surface: destructured runtime parameter object + its TS interface */
  const parameterStructures = buildParameterStructures(
    parameterGroups,
    hasBody,
    bodyInfo.bodyTypeInfo,
    operationSecurityHeaders,
    bodyInfo.shouldGenerateRequestMap,
    bodyInfo.shouldGenerateResponseMap, // This controls generic params, keep as false for unknown mode
    bodyInfo.requestMapTypeName,
    bodyInfo.responseMapTypeName,
  );

  /* Responses & union return type */
  /* Build response handlers + discriminated union return type (ApiResponse<code, data>) */
  const responseHandlers = generateResponseHandlers(
    operation,
    typeImports,
    bodyInfo.shouldExportResponseMap,
    bodyInfo.shouldExportResponseMap ? bodyInfo.responseMapTypeName : undefined,
    forceValidation,
  );

  /* Security overrides/auth headers */
  const overridesSecurity = hasSecurityOverride(operation);
  const authHeaders = extractAuthHeaders(doc);

  /* Function internal body code */
  /* Assemble the inner imperative body (headers, fetch call, switch over request content-type, parsing) */
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
    responseHandlers: responseHandlers.responseHandlers,
    shouldGenerateRequestMap: bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: bodyInfo.shouldGenerateResponseMap,
  });

  return {
    authHeaders,
    bodyInfo,
    functionBodyCode,
    functionName,
    hasBody,
    operationName,
    operationSecurityHeaders,
    overridesSecurity,
    parameterGroups,
    parameterStructures,
    responseHandlers,
    summary,
    typeImports,
  };
}

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
  forceValidation = false,
): GeneratedFunction {
  /* Extract all metadata using pure logic function */
  const metadata = extractOperationMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
    forceValidation,
  );

  /* Render using template functions */
  const parameterDeclaration = buildParameterDeclaration({
    destructuredParams: metadata.parameterStructures.destructuredParams,
    paramsInterface: metadata.parameterStructures.paramsInterface,
  });

  /* Compute generic parameters and adjust return type if response map present */
  const { genericParams, updatedReturnType } = buildGenericParams({
    contentTypeMaps: metadata.bodyInfo.contentTypeMaps,
    discriminatedUnionTypeName:
      metadata.responseHandlers.discriminatedUnionTypeName,
    initialReturnType: metadata.responseHandlers.returnType,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    shouldGenerateRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
  });

  /* Emit request/response map type aliases (only when non-empty / applicable) */
  const typeAliases = buildTypeAliases({
    contentTypeMaps: metadata.bodyInfo.contentTypeMaps,
    discriminatedUnionTypeDefinition:
      metadata.responseHandlers.discriminatedUnionTypeDefinition,
    discriminatedUnionTypeName:
      metadata.responseHandlers.discriminatedUnionTypeName,
    /* Parameter schema generation */
    operationId: operation.operationId,
    parameterGroups: metadata.parameterGroups,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapName: metadata.responseHandlers.responseMapName,
    responseMapType: metadata.responseHandlers.responseMapType,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    shouldGenerateRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: metadata.bodyInfo.shouldGenerateResponseMap, // Use shouldGenerateResponseMap for type aliases
    typeImports: metadata.typeImports,
  });

  /* Render the complete function */
  const functionStr = renderOperationFunction({
    functionBodyCode: metadata.functionBodyCode,
    functionName: metadata.functionName,
    genericParams,
    parameterDeclaration,
    responseMapTypeName: metadata.bodyInfo.shouldGenerateResponseMap
      ? metadata.bodyInfo.responseMapTypeName
      : undefined,
    summary: metadata.summary,
    typeAliases,
    updatedReturnType,
  });

  return { functionCode: functionStr, typeImports: metadata.typeImports };
}

/* ---------------- Helper extraction functions (kept local to module) ---------------- */

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
  // Generate response map generics when we actually have concrete mappings.
  // We still operate in "unknown" validation mode (parsing occurs lazily or via parse())
  // but we need the ability to negotiate content types via Accept header for integration tests
  // (e.g., multi-content-types selecting vendor or xml responses).
  const shouldGenerateResponseMap = !!(
    contentTypeMaps.responseMapType && contentTypeMaps.responseMapType !== "{}"
  );
  const shouldExportResponseMap =
    !!contentTypeMaps.responseMapType &&
    contentTypeMaps.responseMapType !== "{}";

  return {
    bodyTypeInfo,
    contentTypeMaps,
    requestContentType,
    requestContentTypes,
    requestMapTypeName,
    responseMapTypeName,
    shouldExportResponseMap,
    shouldGenerateRequestMap,
    shouldGenerateResponseMap,
  };
}
