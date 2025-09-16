/* Shared response mapping logic with correct structure */

import {
  isReferenceObject,
  type OpenAPIObject,
  type OperationObject,
} from "openapi3-ts/oas31";

import {
  extractResponseContentTypes,
  type ResponseContentTypes,
} from "../client-generator/operation-extractor.js";
import {
  resolveSchemaTypeName,
  resolveStrictSchemaTypeName,
} from "./schema-type-resolver.js";

/**
 * Options for response map generation
 */
export interface ResponseMapOptions {
  /* Whether to generate TypeScript types */
  generateTypes?: boolean;
  /* Whether to use strict schemas (for server generation) */
  useStrictSchemas?: boolean;
}

/**
 * Result of response map generation
 */
export interface ResponseMapResult {
  /* Number of unique content types across all status codes */
  contentTypeCount: number;
  /* Default content type if any */
  defaultContentType: null | string;
  /* Map from status code to content type mapping */
  responseMapType: string;
  /* Whether a response map should be generated */
  shouldGenerateResponseMap: boolean;
  /* Status codes that have responses */
  statusCodes: string[];
  /* Type imports needed */
  typeImports: Set<string>;
}

/**
 * Generates response content type mapping with correct structure
 * Uses status code as primary key: Record<status, Record<contentType, ZodSchema>>
 * This fixes the incorrect structure that was using content type as primary key
 */
export function generateResponseMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  options: ResponseMapOptions = {},
  doc?: OpenAPIObject,
): ResponseMapResult {
  const defaultContentType = { value: null as null | string };
  let contentTypeCount = 0;
  let responseMapType = "{}";
  let shouldGenerateResponseMap = false;
  const statusCodes: string[] = [];
  const allContentTypes = new Set<string>();

  const responseContentTypes = extractResponseContentTypes(operation, doc);
  if (responseContentTypes.length === 0) {
    return {
      contentTypeCount,
      defaultContentType: defaultContentType.value,
      responseMapType,
      shouldGenerateResponseMap,
      statusCodes,
      typeImports: new Set(),
    };
  }

  /* Build status code to content type mapping */
  const statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  > = {};

  // Build mappings from response content types
  buildStatusToContentTypes(
    responseContentTypes,
    operationId,
    typeImports,
    options,
    statusCodes,
    statusToContentTypes,
    allContentTypes,
    defaultContentType,
  );

  // Handle default response
  handleDefaultResponse(
    operation,
    operationId,
    typeImports,
    options,
    statusCodes,
    statusToContentTypes,
    allContentTypes,
    defaultContentType,
  );

  contentTypeCount = allContentTypes.size;
  shouldGenerateResponseMap =
    statusCodes.length > 1 ||
    contentTypeCount > 1 ||
    Object.keys(statusToContentTypes).length > 0;

  // Build response map type string
  responseMapType = buildResponseMapType(statusToContentTypes);

  return {
    contentTypeCount,
    defaultContentType: defaultContentType.value,
    responseMapType,
    shouldGenerateResponseMap,
    statusCodes,
    typeImports,
  };
}

/**
 * Helper to build response map type string
 */
function buildResponseMapType(
  statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  >,
): string {
  if (Object.keys(statusToContentTypes).length === 0) {
    return "{}";
  }

  const statusMappings: string[] = Object.entries(statusToContentTypes).map(
    ([statusCode, contentTypeMappings]) => {
      const contentMappings = contentTypeMappings
        .map(
          ({ contentType, typeName }) => `    "${contentType}": ${typeName},`,
        )
        .join("\n");

      return `  "${statusCode}": {
${contentMappings}
  },`;
    },
  );

  return `{
${statusMappings.join("\n")}
}`;
}

/**
 * Helper to build status to content type mappings
 */
function buildStatusToContentTypes(
  responseContentTypes: ResponseContentTypes[],
  operationId: string,
  typeImports: Set<string>,
  options: ResponseMapOptions,
  statusCodes: string[],
  statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  >,
  allContentTypes: Set<string>,
  defaultContentType: { value: null | string },
): void {
  for (const group of responseContentTypes) {
    if (group.contentTypes.length === 0) continue;

    statusCodes.push(group.statusCode);
    statusToContentTypes[group.statusCode] = [];

    for (const mapping of group.contentTypes) {
      const ct = mapping.contentType;
      allContentTypes.add(ct);

      if (!defaultContentType.value) defaultContentType.value = ct;

      const typeName = options.useStrictSchemas
        ? resolveStrictSchemaTypeName(
            mapping.schema,
            operationId,
            `${group.statusCode}Response`,
            typeImports,
          )
        : resolveSchemaTypeName(
            mapping.schema,
            operationId,
            `${group.statusCode}Response`,
            typeImports,
          );

      statusToContentTypes[group.statusCode].push({
        contentType: ct,
        typeName,
      });
    }
  }
}

/**
 * Helper to handle default response
 */
function handleDefaultResponse(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  options: ResponseMapOptions,
  statusCodes: string[],
  statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  >,
  allContentTypes: Set<string>,
  defaultContentType: { value: null | string },
): void {
  if (operation.responses && "default" in operation.responses) {
    const defaultResponse = operation.responses.default;
    if (defaultResponse && !isReferenceObject(defaultResponse)) {
      const content = defaultResponse.content;
      if (content) {
        const defaultContentTypes: {
          contentType: string;
          typeName: string;
        }[] = [];
        for (const [contentType, mediaType] of Object.entries(content)) {
          if (!mediaType.schema) continue;
          const typeName = options.useStrictSchemas
            ? resolveStrictSchemaTypeName(
                mediaType.schema,
                operationId,
                `DefaultResponse`,
                typeImports,
              )
            : resolveSchemaTypeName(
                mediaType.schema,
                operationId,
                `DefaultResponse`,
                typeImports,
              );
          allContentTypes.add(contentType);
          if (!defaultContentType.value) defaultContentType.value = contentType;
          defaultContentTypes.push({ contentType, typeName });
        }
        if (defaultContentTypes.length > 0) {
          statusCodes.push("default");
          statusToContentTypes["default"] = defaultContentTypes;
        }
      }
    }
  }
}
