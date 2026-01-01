import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import type { ContentTypeMaps } from "../shared/content-type-maps.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateContentTypeMaps } from "../shared/content-type-maps.js";
import { extractParameterGroups } from "../shared/parameter-utils.js";
import { getOperationSecuritySchemes } from "../shared/security-utils.js";

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
  /* Flags indicating which parameter types have actual parameters */
  parameterInfo: {
    hasHeaders: boolean;
    hasPath: boolean;
    hasQuery: boolean;
    isHeadersOptional: boolean;
    isQueryOptional: boolean;
  };
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

  /* Extract parameter groups to determine which parameter types exist */
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );

  /* Extract security headers to calculate header optionality */
  const securityHeaders = getOperationSecuritySchemes(operation, doc);

  /* Calculate optionality - same logic as in parameter-file-generator */
  const isQueryOptional = parameterGroups.queryParams.every(
    (p) => p.required !== true,
  );
  /*
   * Headers are optional only if all header params AND security headers are optional.
   * When required headers exist, they must be provided in params OR config.
   */
  const hasRequiredSecurityHeader = securityHeaders.some((sh) => sh.isRequired);
  const isHeadersOptional =
    parameterGroups.headerParams.every((p) => p.required !== true) &&
    !hasRequiredSecurityHeader;

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
    parameterInfo: {
      hasHeaders:
        parameterGroups.headerParams.length > 0 || securityHeaders.length > 0,
      hasPath: parameterGroups.pathParams.length > 0,
      hasQuery: parameterGroups.queryParams.length > 0,
      isHeadersOptional,
      isQueryOptional,
    },
    pathKey,
  };
}
