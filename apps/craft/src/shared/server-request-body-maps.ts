/* Server-specific request body mapping logic using strict schemas */

import type { OperationObject, RequestBodyObject } from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import type { ContentTypeMapping } from "./types.js";

import { extractRequestContentTypes } from "../client-generator/operation-extractor.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";

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
  /* Map from content type to schema type (using strict schemas) */
  requestMapType: string;
  /* Whether a request map should be generated */
  shouldGenerateRequestMap: boolean;
  /* Type imports needed */
  typeImports: Set<string>;
}

/**
 * Generates server request body content type mapping using strict schemas
 * Maps content type → Strict Zod schema for request bodies
 */
export function generateServerRequestBodyMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
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

    const typeName = resolveStrictSchemaTypeName(
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

/**
 * Resolves a schema to a strict TypeScript type name for server usage
 * Same as resolveSchemaTypeName but adds "Strict" suffix to component schemas
 */
function resolveStrictSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const originalSchemaName = schema.$ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in schema");
    const typeName = `${sanitizeIdentifier(originalSchemaName as string)}Strict`;
    typeImports.add(typeName);
    return typeName;
  }
  /* For inline schemas, generate strict versions with same naming */
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}Strict`;
  typeImports.add(typeName);
  return typeName;
}
