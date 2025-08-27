/* Shared response mapping logic with correct structure */

import type { OperationObject } from "openapi3-ts/oas31";

import { extractResponseContentTypes } from "../client-generator/operation-extractor.js";
import { resolveSchemaTypeName } from "../client-generator/responses.js";

/**
 * Options for response map generation
 */
export interface ResponseMapOptions {
  /* Whether to generate TypeScript types */
  generateTypes?: boolean;
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
): ResponseMapResult {
  let defaultContentType: null | string = null;
  let contentTypeCount = 0;
  let responseMapType = "{}";
  let shouldGenerateResponseMap = false;
  const statusCodes: string[] = [];
  const allContentTypes = new Set<string>();

  const responseContentTypes = extractResponseContentTypes(operation);
  if (responseContentTypes.length === 0) {
    return {
      contentTypeCount,
      defaultContentType,
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

  for (const group of responseContentTypes) {
    if (group.contentTypes.length === 0) continue;

    statusCodes.push(group.statusCode);
    statusToContentTypes[group.statusCode] = [];

    for (const mapping of group.contentTypes) {
      const ct = mapping.contentType;
      allContentTypes.add(ct);

      if (!defaultContentType) defaultContentType = ct;

      const typeName = resolveSchemaTypeName(
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

  contentTypeCount = allContentTypes.size;
  shouldGenerateResponseMap = statusCodes.length > 1 || contentTypeCount > 1;

  if (Object.keys(statusToContentTypes).length > 0) {
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

    responseMapType = `{
${statusMappings.join("\n")}
}`;
  }

  return {
    contentTypeCount,
    defaultContentType,
    responseMapType,
    shouldGenerateResponseMap,
    statusCodes,
    typeImports,
  };
}
