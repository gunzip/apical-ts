import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import type { OperationMetadata } from "./templates/operation-templates.js";

import { ImportManager } from "../core-generator/import-types.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateContentTypeMaps } from "../shared/content-type-maps.js";
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
import {
  buildGenericParams,
  buildParameterDeclaration,
  buildTypeAliasesFromRoute,
  renderOperationFunction,
} from "./templates/operation-templates.js";
import { renderDefaultResponseHandler } from "./templates/response-templates.js";

/* Result of generating a function with imports */
export interface GeneratedFunction {
  functionCode: string;
  importManager: ImportManager;
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
): OperationMetadata {
  assert(operation.operationId, "Operation ID is required");
  const functionName: string = sanitizeIdentifier(operation.operationId);
  const operationName =
    functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const importManager = new ImportManager();
  // Create a temporary Set for legacy response functions
  const responseTypeImports = new Set<string>();

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
    importManager,
    operationName,
    doc,
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
    operation.operationId,
  );

  /* Parameter schemas removed: parameters are available through clientRoute.params from routes */

  /* Responses & union return type */
  /* Build response handlers + discriminated union return type (ApiResponse<code, data>) */
  /* Pass camelCase runtime value name for response map access */
  const responseMapRuntimeName = bodyInfo.shouldExportResponseMap
    ? sanitizeIdentifier(operation.operationId) + "ResponseMap"
    : undefined;

  const responseHandlers = generateResponseHandlers(
    operation,
    responseTypeImports,
    bodyInfo.shouldExportResponseMap,
    responseMapRuntimeName,
    doc,
  );

  // Schema imports removed: schemas are available through route imports

  /* Security overrides/auth headers */
  const overridesSecurity = hasSecurityOverride(operation);
  const authHeaders = extractAuthHeaders(doc);

  /* Generate default response handler if there is a default response */
  const defaultResponseHandler = responseHandlers.defaultResponseInfo
    ? renderDefaultResponseHandler(
        responseHandlers.defaultResponseInfo,
        bodyInfo.shouldExportResponseMap
          ? bodyInfo.responseMapTypeName
          : undefined,
      )
    : undefined;

  /* Function internal body code */
  /* Assemble the inner imperative body (headers, fetch call, switch over request content-type, parsing) */
  const functionBodyCode = generateFunctionBody({
    authHeaders,
    contentTypeMaps: bodyInfo.contentTypeMaps,
    defaultResponseHandler,
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
    importManager,
    operationName,
    operationSecurityHeaders,
    overridesSecurity,
    parameterGroups,
    parameterStructures,
    responseHandlers,
    summary,
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
): GeneratedFunction {
  /* Ensure operation has an operationId */
  if (!operation.operationId) {
    throw new Error(
      `Operation ${method.toUpperCase()} ${pathKey} is missing operationId`,
    );
  }

  /* Extract all metadata using pure logic function */
  const metadata = extractOperationMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
  );

  /* Render using template functions */
  const parameterDeclaration = buildParameterDeclaration({
    destructuredParams: metadata.parameterStructures.destructuredParams,
    paramsInterface: metadata.parameterStructures.paramsInterface,
  });

  /* Compute generic parameters and adjust return type if response map present */
  const { genericParams, updatedReturnType } = buildGenericParams({
    contentTypeMaps: metadata.bodyInfo.contentTypeMaps,
    initialReturnType: metadata.responseHandlers.returnType,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    shouldGenerateRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
  });

  /* Emit request/response map type aliases (only when non-empty / applicable) */
  const typeAliases = buildTypeAliasesFromRoute({
    bodyTypeName: metadata.bodyInfo.bodyTypeInfo?.typeName ?? undefined,
    contentTypeMaps: metadata.bodyInfo.contentTypeMaps,
    hasBody: metadata.hasBody,
    hasHeaderParams:
      metadata.parameterGroups.headerParams.length > 0 ||
      (metadata.operationSecurityHeaders &&
        metadata.operationSecurityHeaders.length > 0),
    hasPathParams: metadata.parameterGroups.pathParams.length > 0,
    hasQueryParams: metadata.parameterGroups.queryParams.length > 0,
    hasRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    hasResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
    importManager: metadata.importManager,
    isBodyOptional:
      !metadata.hasBody || !metadata.bodyInfo.bodyTypeInfo?.isRequired,
    isHeadersOptional:
      metadata.parameterGroups.headerParams.length === 0 &&
      (!metadata.operationSecurityHeaders ||
        metadata.operationSecurityHeaders.length === 0),
    operationId: operation.operationId,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    shouldGenerateRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
  });

  /* Render the complete function */
  const functionStr = renderOperationFunction({
    functionBodyCode: metadata.functionBodyCode,
    functionName: metadata.functionName,
    genericParams,
    parameterDeclaration,
    parameterInterface: metadata.parameterStructures.paramsInterface,
    responseMapTypeName: metadata.bodyInfo.shouldGenerateResponseMap
      ? metadata.bodyInfo.responseMapTypeName
      : undefined,
    summary: metadata.summary,
    typeAliases,
    updatedReturnType,
  });

  return {
    functionCode: functionStr,
    importManager: metadata.importManager,
  };
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
  operationId: string,
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
    operationId,
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
  importManager: ImportManager,
  operationName: string,
  doc: OpenAPIObject,
) {
  let bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined;
  let requestContentType: string | undefined;

  if (
    hasBody &&
    operation.requestBody &&
    !isReferenceObject(operation.requestBody)
  ) {
    const requestBody = operation.requestBody;
    bodyTypeInfo = resolveRequestBodyType(
      requestBody,
      functionName,
      doc.components?.schemas,
    );
    requestContentType = bodyTypeInfo.contentType;
    /* Schema imports removed: available through route imports */
  }

  const requestMapTypeName = `${operationName}RequestMap`;
  const responseMapTypeName = `${operationName}ResponseMap`;

  const contentTypeMaps = generateContentTypeMaps(operation, doc);
  /* Schema imports removed: available through route imports */

  let requestContentTypes: string[] = [];
  if (
    hasBody &&
    operation.requestBody &&
    !isReferenceObject(operation.requestBody)
  ) {
    const requestBody = operation.requestBody;
    if (requestBody.content) {
      requestContentTypes = Object.keys(requestBody.content);
    }
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
