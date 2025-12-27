import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import type { ContentTypeMaps } from "../shared/content-type-maps.js";

import { generateContentTypeMaps } from "../shared/content-type-maps.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Route operation metadata for template generation
 */
export interface RouteOperationMetadata {
  bodyInfo: {
    contentTypeMaps: ContentTypeMaps;
    hasBody: boolean;
    requestMapTypeName: string;
    responseMapTypeName: string;
    shouldGenerateRequestMap: boolean;
  };
  method: string;
  operation: OperationObject;
  operationId: string;
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
  const operationId = operation.operationId;
  if (!operationId) {
    throw new Error("Operation ID is required for route generation");
  }

  /* Extract content-type information using shared logic */
  const contentTypeMaps = generateContentTypeMaps(operation, doc);
  const hasBody = !!operation.requestBody;

  /* Determine if maps should be generated based on content type counts */
  const shouldGenerateRequestMap =
    hasBody && contentTypeMaps.requestContentTypeCount > 0;

  return {
    bodyInfo: {
      contentTypeMaps,
      hasBody,
      requestMapTypeName: `${sanitizeIdentifier(operationId)}RequestMap`,
      responseMapTypeName: `${sanitizeIdentifier(operationId)}ResponseMap`,
      shouldGenerateRequestMap,
    },
    method,
    operation,
    operationId,
    pathKey,
  };
}
