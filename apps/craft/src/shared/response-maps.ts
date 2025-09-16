/* Shared response mapping logic with correct structure */

import { type OpenAPIObject, type OperationObject } from "openapi3-ts/oas31";

import {
  extractResponseContentTypes,
  type ResponseContentTypes,
} from "../client-generator/operation-extractor.js";
import { resolveResponse } from "../client-generator/utils.js";
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
  doc?: OpenAPIObject,
  options: ResponseMapOptions = {},
): ResponseMapResult {
  let contentTypeCount = 0;
  let responseMapType = "{}";
  let shouldGenerateResponseMap = false;

  const responseContentTypes = extractResponseContentTypes(operation, doc);

  // Build mappings from response content types
  const buildResult = buildStatusToContentTypes(
    responseContentTypes,
    operationId,
    typeImports,
    options,
  );

  // Handle default response
  const updatedResult = applyDefaultResponse(
    operation,
    operationId,
    buildResult.updatedTypeImports,
    doc,
    options,
    buildResult.statusCodes,
    buildResult.statusToContentTypes,
    buildResult.allContentTypes,
    buildResult.defaultContentType,
  );

  contentTypeCount = updatedResult.allContentTypes.size;
  shouldGenerateResponseMap =
    updatedResult.statusCodes.length > 0 || contentTypeCount > 1;

  // Build response map type string
  responseMapType = buildResponseMapType(updatedResult.statusToContentTypes);

  return {
    contentTypeCount,
    defaultContentType: updatedResult.defaultContentType,
    responseMapType,
    shouldGenerateResponseMap,
    statusCodes: updatedResult.statusCodes,
    typeImports: updatedResult.updatedTypeImports,
  };
}

/**
 * Helper to handle default response
 */
function applyDefaultResponse(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  doc: OpenAPIObject | undefined,
  options: ResponseMapOptions,
  statusCodes: string[],
  statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  >,
  allContentTypes: Set<string>,
  defaultContentType: null | string,
): {
  allContentTypes: Set<string>;
  defaultContentType: null | string;
  statusCodes: string[];
  statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  >;
  updatedTypeImports: Set<string>;
} {
  const updatedStatusCodes = [...statusCodes];
  const updatedStatusToContentTypes = { ...statusToContentTypes };
  const updatedAllContentTypes = new Set(allContentTypes);
  let updatedDefaultContentType = defaultContentType;
  const updatedTypeImports = new Set(typeImports);

  if (operation.responses && "default" in operation.responses) {
    const defaultResponse = operation.responses.default;
    const resolvedDefault = defaultResponse
      ? resolveResponse(defaultResponse, doc)
      : undefined;
    if (resolvedDefault && resolvedDefault.content) {
      const defaultContentTypes: {
        contentType: string;
        typeName: string;
      }[] = [];
      for (const [contentType, mediaType] of Object.entries(
        resolvedDefault.content,
      )) {
        if (!mediaType.schema) continue;
        const typeName = options.useStrictSchemas
          ? resolveStrictSchemaTypeName(
              mediaType.schema,
              operationId,
              `DefaultResponse`,
              updatedTypeImports,
            )
          : resolveSchemaTypeName(
              mediaType.schema,
              operationId,
              `DefaultResponse`,
              updatedTypeImports,
            );
        updatedAllContentTypes.add(contentType);
        if (!updatedDefaultContentType) {
          updatedDefaultContentType = contentType;
        }
        defaultContentTypes.push({ contentType, typeName });
      }
      if (defaultContentTypes.length > 0) {
        updatedStatusCodes.push("default");
        updatedStatusToContentTypes["default"] = defaultContentTypes;
      }
    }
  }

  return {
    allContentTypes: updatedAllContentTypes,
    defaultContentType: updatedDefaultContentType,
    statusCodes: updatedStatusCodes,
    statusToContentTypes: updatedStatusToContentTypes,
    updatedTypeImports,
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
): {
  allContentTypes: Set<string>;
  defaultContentType: null | string;
  statusCodes: string[];
  statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  >;
  updatedTypeImports: Set<string>;
} {
  const statusCodes: string[] = [];
  const statusToContentTypes: Record<
    string,
    { contentType: string; typeName: string }[]
  > = {};
  const allContentTypes = new Set<string>();
  let defaultContentType: null | string = null;
  const updatedTypeImports = new Set(typeImports);

  for (const group of responseContentTypes) {
    if (group.contentTypes.length === 0) continue;

    statusCodes.push(group.statusCode);
    statusToContentTypes[group.statusCode] = [];

    for (const mapping of group.contentTypes) {
      const ct = mapping.contentType;
      allContentTypes.add(ct);

      if (!defaultContentType) defaultContentType = ct;

      const typeName = options.useStrictSchemas
        ? resolveStrictSchemaTypeName(
            mapping.schema,
            operationId,
            `${group.statusCode}Response`,
            updatedTypeImports,
          )
        : resolveSchemaTypeName(
            mapping.schema,
            operationId,
            `${group.statusCode}Response`,
            updatedTypeImports,
          );

      statusToContentTypes[group.statusCode].push({
        contentType: ct,
        typeName,
      });
    }
  }

  return {
    allContentTypes,
    defaultContentType,
    statusCodes,
    statusToContentTypes,
    updatedTypeImports,
  };
}
