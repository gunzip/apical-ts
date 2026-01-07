/* Server-specific request body mapping logic */

import type {
  OperationObject,
  RequestBodyObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import type { ContentTypeMapping } from "./types.js";

import { extractRequestContentTypes } from "./operation-utils.js";
import { resolveSchemaTypeName } from "./schema-type-resolver.js";

/**
 * Result of server request body map generation
 */
export interface ServerRequestBodyMapResult {
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
 * Generates server request body content type mapping
 * Maps content type → Zod schema for request bodies
 */
export function generateServerRequestBodyMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  resolvedSchemas?: Record<string, SchemaObject>,
): ServerRequestBodyMapResult {
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

  /* First content-type is chosen as default */
  defaultContentType = requestContentTypes.contentTypes[0].contentType;

  const requestMappings = requestContentTypes.contentTypes.map((mapping) => {
    contentTypeMappings.push(mapping);

    const typeName = resolveSchemaTypeName(
      mapping.schema,
      operationId,
      "Request",
      typeImports,
      "request",
      resolvedSchemas,
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
