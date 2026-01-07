import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import assert from "assert";

import { generateRequestBodyMap } from "./request-body-maps.js";
import { generateResponseMap } from "./response-maps.js";

/**
 * Result of generating content type maps
 */
export interface ContentTypeMaps {
  defaultRequestContentType: null | string;
  defaultResponseContentType: null | string;
  requestContentTypeCount: number;
  requestMapType: string;
  responseContentTypeCount: number;
  responseMapType: string;
  typeImports: Set<string>;
}

/**
 * Generates TypeScript type maps for request and response content types.
 */
export function generateContentTypeMaps(
  operation: OperationObject,
  doc?: OpenAPIObject,
): ContentTypeMaps {
  assert(operation.operationId, "Operation ID is required");
  const typeImports = new Set<string>();
  const operationId = operation.operationId as string; // asserted

  const request = buildRequestContentTypeMap(
    operation,
    operationId,
    typeImports,
    doc,
  );
  const response = buildResponseContentTypeMap(
    operation,
    operationId,
    typeImports,
    doc,
  );

  return {
    defaultRequestContentType: request.defaultRequestContentType,
    defaultResponseContentType: response.defaultResponseContentType,
    requestContentTypeCount: request.requestContentTypeCount,
    requestMapType: request.requestMapType,
    responseContentTypeCount: response.responseContentTypeCount,
    responseMapType: response.responseMapType,
    typeImports,
  };
}

/**
 * Build the request content-type map for an operation using shared logic.
 * Returns default request content type, count and the map type body.
 */
function buildRequestContentTypeMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  doc?: OpenAPIObject,
) {
  /* Use shared request body mapping logic with resolved schemas for variant resolution */
  const resolvedSchemas = doc?.components?.schemas;
  const result = generateRequestBodyMap(
    operation,
    operationId,
    typeImports,
    resolvedSchemas,
  );

  /* Merge type imports */
  result.typeImports.forEach((imp) => typeImports.add(imp));

  return {
    defaultRequestContentType: result.defaultContentType,
    requestContentTypeCount: result.contentTypeCount,
    requestMapType: result.requestMapType,
  };
}

/**
 * Internal helper that aggregates response schema type names with correct structure.
 * Fixed to use status code as primary key: Record<status, Record<contentType, ZodSchema>>
 *
 * This function uses the shared response mapping logic to build the correct structure
 * where status code is the primary key, and for each status, a map from content type to schema.
 */
function buildResponseContentTypeMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  doc?: OpenAPIObject,
) {
  /* Use shared response mapping logic with resolved schemas for variant resolution */
  const resolvedSchemas = doc?.components?.schemas;
  const result = generateResponseMap(
    operation,
    operationId,
    typeImports,
    doc,
    {},
    resolvedSchemas,
  );

  /* Merge type imports */
  result.typeImports.forEach((imp) => typeImports.add(imp));

  return {
    defaultResponseContentType: result.defaultContentType,
    responseContentTypeCount: result.contentTypeCount,
    responseMapType: result.responseMapType,
  };
}
