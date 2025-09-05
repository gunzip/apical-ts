import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import assert from "assert";

import { extractOperationMetadata } from "../client-generator/operation-function-generator.js";
import { extractParameterGroups } from "../client-generator/parameters.js";
import { resolveRequestBodyType } from "../client-generator/request-body.js";
import { generateContentTypeMaps } from "../client-generator/responses.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateServerRequestBodyMap } from "../shared/server-request-body-maps.js";
import {
  buildServerRequestMap,
  buildServerResponseMap,
  renderServerOperationWrapper,
} from "./templates/server-operation-templates.js";

/* Result of generating a server wrapper function with imports */
export interface GeneratedServerWrapper {
  typeImports: Set<string>;
  wrapperCode: string;
}

/**
 * Server operation metadata for template generation
 */
export interface ServerOperationMetadata {
  bodyInfo: {
    bodyTypeInfo?: ReturnType<typeof resolveRequestBodyType>;
    contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
    hasBody: boolean;
    requestMapTypeName?: string;
    responseMapTypeName?: string;
    serverRequestBodyMap: ReturnType<typeof generateServerRequestBodyMap>;
    shouldGenerateRequestMap: boolean;
    shouldGenerateResponseMap: boolean;
  };
  functionName: string;
  operation: OperationObject;
  operationId: string;
  parameterGroups: ReturnType<typeof extractParameterGroups>;
  summary?: string;
}

/**
 * Extracts metadata needed for server operation wrapper generation
 */
export function extractServerOperationMetadata(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): ServerOperationMetadata {
  assert(operation.operationId, "Operation ID is required");
  const operationId = operation.operationId;
  const functionName = `${sanitizeIdentifier(operationId)}Wrapper`;
  /* Reuse client extraction logic to avoid duplication */
  const clientMeta = extractOperationMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
  );

  /* Server wrappers have slightly different heuristics:
     - Only emit request/response maps when there is more than one content type.
       (The client generator may still emit maps for a single entry for generic negotiation.) */
  const contentTypeMaps = clientMeta.bodyInfo.contentTypeMaps;
  const hasBody = clientMeta.hasBody;
  const bodyTypeInfo = clientMeta.bodyInfo.bodyTypeInfo;

  /* Generate strict server request body map */
  const typeImports = new Set<string>();
  const serverRequestBodyMap = generateServerRequestBodyMap(
    operation,
    operationId,
    typeImports,
  );

  const shouldGenerateRequestMap = contentTypeMaps.requestContentTypeCount > 1;
  const shouldGenerateResponseMap =
    contentTypeMaps.responseContentTypeCount > 1;

  const requestMapTypeName = shouldGenerateRequestMap
    ? `${sanitizeIdentifier(operationId)}RequestMap`
    : undefined;
  const responseMapTypeName = shouldGenerateResponseMap
    ? `${sanitizeIdentifier(operationId)}ResponseMap`
    : undefined;

  const parameterGroups = clientMeta.parameterGroups;

  return {
    bodyInfo: {
      bodyTypeInfo,
      contentTypeMaps,
      hasBody,
      requestMapTypeName,
      responseMapTypeName,
      serverRequestBodyMap,
      shouldGenerateRequestMap,
      shouldGenerateResponseMap,
    },
    functionName,
    operation,
    operationId,
    parameterGroups,
    summary: operation.summary?.trim(),
  };
}

/**
 * Generates server operation wrapper function with validation logic
 */
export function generateServerOperationWrapper(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): GeneratedServerWrapper {
  const metadata = extractServerOperationMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
  );

  const typeImports = new Set<string>();

  /* Build request map if needed */
  const requestMapCode = metadata.bodyInfo.shouldGenerateRequestMap
    ? buildServerRequestMap(metadata, typeImports)
    : "";

  /* Build response map */
  const responseMapCode = buildServerResponseMap(metadata, typeImports);

  /* Render the complete wrapper function */
  const wrapperCode = renderServerOperationWrapper({
    functionName: metadata.functionName,
    hasBody: metadata.bodyInfo.hasBody,
    method: method.toLowerCase(),
    operationId: metadata.operationId,
    parameterGroups: metadata.parameterGroups,
    pathKey,
    requestMapCode,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapCode,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    summary: metadata.summary,
    typeImports,
  });

  return {
    typeImports,
    wrapperCode,
  };
}
