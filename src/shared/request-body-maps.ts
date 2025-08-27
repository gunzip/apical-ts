/* Shared request body mapping logic */

import type { OperationObject, RequestBodyObject } from "openapi3-ts/oas31";

import type { ContentTypeMapping } from "./types.js";

import { extractRequestContentTypes } from "../client-generator/operation-extractor.js";
import { resolveSchemaTypeName } from "../client-generator/responses.js";

/**
 * Options for request body map generation
 */
export interface RequestBodyMapOptions {
  /* Whether to generate TypeScript types */
  generateTypes?: boolean;
}

/**
 * Result of request body map generation
 */
export interface RequestBodyMapResult {
  /* Number of content types */
  contentTypeCount: number;
  /* Content type mappings */
  contentTypeMappings: ContentTypeMapping[];
  /* Default content type if any */
  defaultContentType: null | string;
  /* Map from content type to schema type */
  requestMapType: string;
  /* Whether a request map should be generated */
  shouldGenerateRequestMap: boolean;
  /* Type imports needed */
  typeImports: Set<string>;
}

/**
 * Generates request body content type mapping
 * Maps content type → Zod schema for request bodies
 */
export function generateRequestBodyMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
): RequestBodyMapResult {
  let defaultContentType: null | string = null;
  let contentTypeCount = 0;
  let requestMapType = "{}";
  let shouldGenerateRequestMap = false;
  const contentTypeMappings: ContentTypeMapping[] = [];

  const requestContentTypes = operation.requestBody
    ? extractRequestContentTypes(operation.requestBody as RequestBodyObject)
    : null;
  if (!requestContentTypes || requestContentTypes.contentTypes.length === 0) {
    return {
      contentTypeCount,
      contentTypeMappings,
      defaultContentType,
      requestMapType,
      shouldGenerateRequestMap,
      typeImports: new Set(),
    };
  }

  contentTypeCount = requestContentTypes.contentTypes.length;
  shouldGenerateRequestMap = contentTypeCount > 1;

  if (contentTypeCount === 0) {
    return {
      contentTypeCount,
      contentTypeMappings,
      defaultContentType,
      requestMapType,
      shouldGenerateRequestMap,
      typeImports: new Set(),
    };
  }

  /* First content-type is chosen as default */
  defaultContentType = requestContentTypes.contentTypes[0].contentType;

  const requestMappings = requestContentTypes.contentTypes.map((mapping) => {
    contentTypeMappings.push(mapping);

    const typeName = resolveSchemaTypeName(
      mapping.schema,
      operationId,
      "Request",
      typeImports,
    );
    return `  "${mapping.contentType}": ${typeName};`;
  });

  requestMapType = `{
${requestMappings.join("\n")}
}`;

  return {
    contentTypeCount,
    contentTypeMappings,
    defaultContentType,
    requestMapType,
    shouldGenerateRequestMap,
    typeImports,
  };
}
