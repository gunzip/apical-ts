/* Shared request body mapping logic */

import type { OperationObject, RequestBodyObject } from "openapi3-ts/oas31";
import { extractRequestContentTypes } from "../client-generator/operation-extractor.js";
import { resolveSchemaTypeName } from "../client-generator/responses.js";
import type { ContentTypeMapping } from "./types.js";

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
  /* Whether a request map should be generated */
  shouldGenerateRequestMap: boolean;
  /* Map from content type to schema type */
  requestMapType: string;
  /* Type imports needed */
  typeImports: Set<string>;
  /* Default content type if any */
  defaultContentType: string | null;
  /* Number of content types */
  contentTypeCount: number;
  /* Content type mappings */
  contentTypeMappings: ContentTypeMapping[];
}

/**
 * Generates request body content type mapping
 * Maps content type → Zod schema for request bodies
 */
export function generateRequestBodyMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  options: RequestBodyMapOptions = {},
): RequestBodyMapResult {
  const { generateTypes = true } = options;
  
  let defaultContentType: string | null = null;
  let contentTypeCount = 0;
  let requestMapType = "{}";
  let shouldGenerateRequestMap = false;
  const contentTypeMappings: ContentTypeMapping[] = [];

  const requestContentTypes = operation.requestBody 
    ? extractRequestContentTypes(operation.requestBody as RequestBodyObject)
    : null;
  if (!requestContentTypes || requestContentTypes.contentTypes.length === 0) {
    return {
      shouldGenerateRequestMap,
      requestMapType,
      typeImports: new Set(),
      defaultContentType,
      contentTypeCount,
      contentTypeMappings,
    };
  }

  contentTypeCount = requestContentTypes.contentTypes.length;
  shouldGenerateRequestMap = contentTypeCount > 1;
  
  if (contentTypeCount === 0) {
    return {
      shouldGenerateRequestMap,
      requestMapType,
      typeImports: new Set(),
      defaultContentType,
      contentTypeCount,
      contentTypeMappings,
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
    shouldGenerateRequestMap,
    requestMapType,
    typeImports,
    defaultContentType,
    contentTypeCount,
    contentTypeMappings,
  };
}