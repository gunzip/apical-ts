import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import {
  extractParameterGroups,
  generateContentTypeMaps,
  getOperationSecuritySchemes,
} from "@apical-ts/core-utils/shared";
import assert from "assert";

import { renderServerOperationWrapper } from "./templates/server-operation-templates.js";

/* Result of generating a server wrapper function */
interface GeneratedServerWrapper {
  wrapperCode: string;
}

/*
 * Lightweight metadata for server wrapper generation.
 * All type/schema generation is now handled by the route-generator;
 * this module only needs minimal info to render the wrapper function.
 */
interface ServerWrapperMetadata {
  functionName: string;
  hasBody: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  method: string;
  operationId: string;
  pathKey: string;
  requestMapTypeName: string | undefined;
  responseMapTypeName: string;
  summary: string | undefined;
}

/*
 * Generates server operation wrapper function.
 * The wrapper imports all types and schemas from the corresponding route module.
 */
export function generateServerOperationWrapper(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): GeneratedServerWrapper {
  const metadata = extractServerWrapperMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
  );

  const wrapperCode = renderServerOperationWrapper({
    functionName: metadata.functionName,
    hasBody: metadata.hasBody,
    hasHeaders: metadata.hasHeaders,
    hasPath: metadata.hasPath,
    hasQuery: metadata.hasQuery,
    method: metadata.method,
    operationId: metadata.operationId,
    pathKey: metadata.pathKey,
    requestMapTypeName: metadata.requestMapTypeName,
    responseMapTypeName: metadata.responseMapTypeName,
    summary: metadata.summary,
  });

  return {
    wrapperCode,
  };
}

/*
 * Extracts minimal metadata needed for server wrapper generation.
 * All schema/type generation happens in route-generator.
 */
function extractServerWrapperMetadata(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject,
): ServerWrapperMetadata {
  assert(operation.operationId, "Operation ID is required");
  const operationId = operation.operationId;
  const sanitizedId = sanitizeIdentifier(operationId);
  const contentTypeMaps = generateContentTypeMaps(operation, doc);
  const hasBody = contentTypeMaps.requestContentTypeCount > 0;

  /* Extract parameter groups to determine which parameter types exist */
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );

  /* Extract security headers - same as route-generator */
  const securityHeaders = getOperationSecuritySchemes(operation, doc);

  return {
    functionName: `${sanitizedId}Wrapper`,
    hasBody,
    hasHeaders:
      parameterGroups.headerParams.length > 0 || securityHeaders.length > 0,
    hasPath: parameterGroups.pathParams.length > 0,
    hasQuery: parameterGroups.queryParams.length > 0,
    method: method.toLowerCase(),
    operationId,
    pathKey,
    /* Keep wrapper body handling aligned with the generated route request map. */
    requestMapTypeName: hasBody ? `${sanitizedId}RequestMap` : undefined,
    responseMapTypeName: `${sanitizedId}ResponseMap`,
    summary: operation.summary?.trim(),
  };
}
