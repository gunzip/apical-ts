import type {
  ContentTypeMaps,
  OperationGenerationMetadata,
} from "@apical-ts/core-utils/shared";
import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { extractOperationGenerationMetadata } from "@apical-ts/core-utils/shared";

/**
 * Route operation metadata for template generation
 */
export interface RouteOperationMetadata {
  bodyInfo: {
    contentTypeMaps: ContentTypeMaps;
    hasBody: boolean;
    requestMapTypeName: string;
    responseHeadersMapTypeName: string;
    responseMapTypeName: string;
    shouldGenerateResponseHeadersMap: boolean;
    shouldGenerateRequestMap: boolean;
    shouldGenerateResponseMap: boolean;
  };
  method: string;
  operation: OperationObject;
  operationId: string;
  /* Flags indicating which parameter types have actual parameters */
  parameterInfo: OperationGenerationMetadata["parameterInfo"];
  pathKey: string;
}

/**
 * Lightweight metadata extraction for route generation.
 * Unlike the client generator's extractOperationMetadata, this function only computes
 * what's needed for route metadata files, without generating function bodies or
 * parameter destructuring.
 */
export function extractRouteOperationMetadata(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject,
): RouteOperationMetadata {
  const sharedMetadata = extractOperationGenerationMetadata({
    doc,
    method,
    operation,
    pathKey,
    pathLevelParameters,
  });

  return extractRouteOperationMetadataFromMetadata(sharedMetadata);
}

export function extractRouteOperationMetadataFromMetadata(
  metadata: OperationGenerationMetadata,
): RouteOperationMetadata {
  return {
    bodyInfo: {
      contentTypeMaps: metadata.bodyInfo.contentTypeMaps,
      hasBody: metadata.bodyInfo.hasRequestBody,
      requestMapTypeName: `${metadata.functionName}RequestMap`,
      responseHeadersMapTypeName: `${metadata.functionName}ResponseHeadersMap`,
      responseMapTypeName: `${metadata.functionName}ResponseMap`,
      shouldGenerateResponseHeadersMap:
        metadata.bodyInfo.shouldGenerateResponseHeaderMap,
      shouldGenerateRequestMap: metadata.bodyInfo.shouldGenerateRequestMap,
      shouldGenerateResponseMap: metadata.bodyInfo.shouldGenerateResponseMap,
    },
    method: metadata.method,
    operation: metadata.operation,
    operationId: metadata.operationId,
    parameterInfo: metadata.parameterInfo,
    pathKey: metadata.pathKey,
  };
}
