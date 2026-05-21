import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { ImportManager, sanitizeIdentifier } from "@apical-ts/core-utils";
import {
  extractAuthHeaders,
  extractOperationGenerationMetadata,
  type OperationGenerationMetadata,
  type ParameterGroups,
  type SecurityHeader,
} from "@apical-ts/core-utils/shared";
import { isReferenceObject } from "openapi3-ts/oas31";

import type { OperationMetadata } from "./templates/operation-templates.js";

import { generateFunctionBody } from "./code-generation.js";
import { resolveRequestBodyType } from "./request-body.js";
import { generateResponseHandlers } from "./responses.js";
import {
  buildGenericParams,
  buildParameterDeclaration,
  buildTypeAliasesFromRoute,
  renderOperationFunction,
} from "./templates/operation-templates.js";
import { renderDefaultResponseHandler } from "./templates/response-templates.js";

/* Result of generating a function with imports */
interface GeneratedFunction {
  functionCode: string;
  importManager: ImportManager;
}

interface BodyAndContentTypesConfig {
  doc: OpenAPIObject;
  functionName: string;
  operation: OperationObject;
  operationName: string;
  sharedBodyInfo: OperationGenerationMetadata["bodyInfo"];
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
  const sharedMetadata = extractOperationGenerationMetadata({
    doc,
    method,
    operation,
    pathKey,
    pathLevelParameters,
  });

  return createOperationMetadata(sharedMetadata, doc);
}

export function generateOperationFunctionFromMetadata(
  sharedMetadata: OperationGenerationMetadata,
  doc: OpenAPIObject,
): GeneratedFunction {
  const metadata = createOperationMetadata(sharedMetadata, doc);

  /* Render using template functions */
  const parameterDeclaration = buildParameterDeclaration({
    destructuredParams: metadata.parameterStructures.destructuredParams,
    paramsInterface: metadata.parameterStructures.paramsInterface,
    shouldDefaultParams: metadata.shouldDefaultParams,
  });

  /* Compute generic parameters and adjust return type if response map present */
  const { genericParams, updatedReturnType } = buildGenericParams({
    contentTypeMaps: metadata.bodyInfo.contentTypeMaps,
    initialReturnType: metadata.responseHandlers.returnType,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    responseHeadersMapTypeName: metadata.bodyInfo.responseHeadersMapTypeName,
    shouldGenerateResponseHeadersMap:
      metadata.bodyInfo.shouldGenerateResponseHeadersMap,
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
      metadata.operationSecurityHeaders.length > 0,
    hasPathParams: metadata.parameterGroups.pathParams.length > 0,
    hasQueryParams: metadata.parameterGroups.queryParams.length > 0,
    hasRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    hasResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
    importManager: metadata.importManager,
    isBodyOptional:
      !metadata.hasBody || !metadata.bodyInfo.bodyTypeInfo?.isRequired,
    isHeadersOptional: metadata.isHeadersOptional,
    isQueryOptional: metadata.isQueryOptional,
    operationId: sharedMetadata.operationId,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseHeadersMapTypeName: metadata.bodyInfo.responseHeadersMapTypeName,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    shouldGenerateResponseHeadersMap:
      metadata.bodyInfo.shouldGenerateResponseHeadersMap,
    shouldGenerateRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
  });

  /* Render the complete function */
  const functionStr = renderOperationFunction({
    canOmitParams: metadata.shouldDefaultParams,
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

function createOperationMetadata(
  sharedMetadata: OperationGenerationMetadata,
  doc: OpenAPIObject,
): OperationMetadata {
  const {
    bodyInfo: sharedBodyInfo,
    functionName,
    method,
    operation,
    operationId,
    operationName,
    operationSecurityHeaders,
    overridesSecurity,
    parameterGroups,
    parameterInfo,
    pathKey,
  } = sharedMetadata;

  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const importManager = new ImportManager();
  const responseTypeImports = new Set<string>();

  const bodyInfo = collectBodyAndContentTypes({
    doc,
    functionName,
    operation,
    operationName,
    sharedBodyInfo,
  });
  const hasBody =
    sharedBodyInfo.hasRequestBody && bodyInfo.requestContentTypes.length > 0;

  const parameterStructures = buildParameterStructures(
    parameterGroups,
    hasBody,
    bodyInfo.bodyTypeInfo,
    operationSecurityHeaders,
    bodyInfo.shouldGenerateRequestMap,
    bodyInfo.shouldGenerateResponseMap,
    bodyInfo.requestMapTypeName,
    bodyInfo.responseMapTypeName,
    operationId,
  );

  const hasSurfaceParams =
    parameterGroups.queryParams.length > 0 ||
    parameterGroups.headerParams.length > 0 ||
    operationSecurityHeaders.length > 0 ||
    hasBody ||
    bodyInfo.shouldGenerateRequestMap ||
    bodyInfo.shouldGenerateResponseMap;
  const isBodyRequired = !!(hasBody && bodyInfo.bodyTypeInfo?.isRequired);
  const shouldDefaultParams =
    hasSurfaceParams &&
    parameterGroups.pathParams.length === 0 &&
    parameterInfo.isQueryOptional &&
    parameterInfo.isHeadersOptional &&
    !isBodyRequired;

  const responseMapRuntimeName = bodyInfo.shouldExportResponseMap
    ? `${functionName}ResponseMap`
    : undefined;
  const responseHeadersMapRuntimeName = bodyInfo.shouldExportResponseHeadersMap
    ? `${functionName}ResponseHeadersMap`
    : undefined;
  const responseHandlers = generateResponseHandlers(
    operation,
    responseTypeImports,
    bodyInfo.shouldExportResponseMap,
    responseMapRuntimeName,
    doc,
    responseHeadersMapRuntimeName,
  );

  const authHeaders = extractAuthHeaders(doc);
  const defaultResponseHandler = responseHandlers.defaultResponseInfo
    ? renderDefaultResponseHandler(
        responseHandlers.defaultResponseInfo,
        bodyInfo.shouldExportResponseMap
          ? bodyInfo.responseMapTypeName
          : undefined,
        bodyInfo.shouldExportResponseHeadersMap
          ? bodyInfo.responseHeadersMapTypeName
          : undefined,
      )
    : undefined;

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
    isHeadersOptional: parameterInfo.isHeadersOptional,
    isQueryOptional: parameterInfo.isQueryOptional,
    operationName,
    operationSecurityHeaders,
    overridesSecurity,
    parameterGroups,
    parameterStructures,
    responseHandlers,
    shouldDefaultParams,
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

  const sharedMetadata = extractOperationGenerationMetadata({
    doc,
    method,
    operation,
    pathKey,
    pathLevelParameters,
  });

  return generateOperationFunctionFromMetadata(sharedMetadata, doc);
}

/* ---------------- Helper extraction functions (kept local to module) ---------------- */

/**
 * buildParameterStructures
 * Returns both: (1) destructured parameter object used in the function signature, (2) its interface type.
 * The interface type name is derived from the operation ID and matches the type alias generated in routes.
 */
function buildParameterStructures(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined,
  operationSecurityHeaders: SecurityHeader[],
  shouldGenerateRequestMap: boolean,
  shouldGenerateResponseMap: boolean,
  requestMapTypeName: string,
  responseMapTypeName: string,
  operationId: string,
) {
  /* Check if we have any parameters at all */
  const hasAnyParams =
    parameterGroups.pathParams.length > 0 ||
    parameterGroups.queryParams.length > 0 ||
    parameterGroups.headerParams.length > 0 ||
    operationSecurityHeaders.length > 0 ||
    hasBody ||
    shouldGenerateRequestMap ||
    shouldGenerateResponseMap;

  /* Destructured params is just "params" if we have anything, otherwise "{}" */
  const destructuredParams = hasAnyParams ? "params" : "{}";

  /* Interface type name matches the type alias generated from routes */
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const operationName =
    sanitizedOperationId.charAt(0).toUpperCase() +
    sanitizedOperationId.slice(1);

  let paramsInterface = `${operationName}Params`;

  /* Add generic parameters if needed */
  if (shouldGenerateRequestMap || shouldGenerateResponseMap) {
    const genericParts: string[] = [];
    if (shouldGenerateRequestMap) genericParts.push("TRequestContentType");
    if (shouldGenerateResponseMap) genericParts.push("TResponseContentType");
    paramsInterface = `${operationName}Params<${genericParts.join(", ")}>`;
  }

  /* If no params at all, use empty object literal type */
  if (!hasAnyParams) {
    paramsInterface = "{}";
  }

  return { destructuredParams, paramsInterface };
}

/**
 * collectBodyAndContentTypes
 * Gathers request body type info, enumerates request content types, and builds the request & response map metadata.
 * shouldGenerateRequestMap: only true when a body exists AND the generated request map isn't an empty {}.
 * shouldGenerateResponseMap: true when response map has entries (non-empty {}).
 * Returns an object with everything needed downstream (maps, defaults, flags, imports augmented).
 */
function collectBodyAndContentTypes({
  doc,
  functionName,
  operation,
  operationName,
  sharedBodyInfo,
}: BodyAndContentTypesConfig) {
  let bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined;
  let requestContentType: string | undefined;

  if (
    sharedBodyInfo.hasRequestBody &&
    operation.requestBody &&
    !isReferenceObject(operation.requestBody)
  ) {
    bodyTypeInfo = resolveRequestBodyType(
      operation.requestBody,
      functionName,
      doc.components?.schemas,
    );
    requestContentType = bodyTypeInfo.contentType;
  }

  return {
    bodyTypeInfo,
    contentTypeMaps: sharedBodyInfo.contentTypeMaps,
    requestContentType,
    requestContentTypes: sharedBodyInfo.requestContentTypes,
    requestMapTypeName: `${operationName}RequestMap`,
    responseMapTypeName: `${operationName}ResponseMap`,
    responseHeadersMapTypeName: `${operationName}ResponseHeadersMap`,
    shouldExportResponseHeadersMap:
      sharedBodyInfo.shouldGenerateResponseHeaderMap,
    shouldExportResponseMap: sharedBodyInfo.shouldGenerateResponseMap,
    shouldGenerateResponseHeadersMap:
      sharedBodyInfo.shouldGenerateResponseHeaderMap,
    shouldGenerateRequestMap: sharedBodyInfo.shouldGenerateRequestMap,
    shouldGenerateResponseMap: sharedBodyInfo.shouldGenerateResponseMap,
  };
}
