import type {
  OperationObject,
  RequestBodyObject,
  ResponseObject,
} from "openapi3-ts/oas31";

import assert from "assert";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import {
  type ContentTypeMapping,
  extractRequestContentTypes,
  extractResponseContentTypes,
} from "./operation-extractor.js";
import { getResponseContentType } from "./utils.js";

/**
 * Result of generating content type maps
 */
export type ContentTypeMaps = {
  defaultRequestContentType: null | string;
  defaultResponseContentType: null | string;
  requestContentTypeCount: number;
  requestMapType: string;
  responseContentTypeCount: number;
  responseMapType: string;
  typeImports: Set<string>;
};

/**
 * Result of response handler generation
 */
export type ResponseHandlerResult = {
  responseHandlers: string[];
  returnType: string;
};

/**
 * Information about response types and handlers
 */
export type ResponseTypeInfo = {
  responseHandlers: string[];
  typeImports: Set<string>;
  typeName: null | string;
};

/**
 * Generates TypeScript type maps for request and response content types
 */
export function generateContentTypeMaps(
  operation: OperationObject,
): ContentTypeMaps {
  assert(operation.operationId, "Operation ID is required");
  const operationId = operation.operationId;
  const typeImports = new Set<string>();

  // Generate request map type
  let requestMapType = "{}";
  let defaultRequestContentType: null | string = null;
  let requestContentTypeCount = 0;

  if (operation.requestBody) {
    const requestBody = operation.requestBody as RequestBodyObject;
    const requestContentTypes = extractRequestContentTypes(requestBody);

    requestContentTypeCount = requestContentTypes.contentTypes.length;
    if (requestContentTypes.contentTypes.length > 0) {
      defaultRequestContentType =
        requestContentTypes.contentTypes[0].contentType;

      const requestMappings = requestContentTypes.contentTypes.map(
        (mapping) => {
          const typeName = resolveSchemaTypeName(
            mapping.schema,
            operationId,
            "Request",
            typeImports,
          );
          return `  "${mapping.contentType}": ${typeName};`;
        },
      );

      requestMapType = `{\n${requestMappings.join("\n")}\n}`;
    }
  }
  // Generate response map type (only if all statuses have at least one content type)
  let responseMapType = "{}";
  let defaultResponseContentType: null | string = null;
  let responseContentTypeCount = 0;

  const responseContentTypes = extractResponseContentTypes(operation);
  if (responseContentTypes.length > 0) {
    const explicitStatuses = Object.keys(operation.responses || {}).filter(
      (c) => c !== "default",
    );
    const contentTypeToResponses: Record<
      string,
      { status: string; typeName: string }[]
    > = {};
    const statusesWithContent = new Set<string>();

    for (const group of responseContentTypes) {
      if (group.contentTypes.length === 0) continue;
      for (const mapping of group.contentTypes) {
        const ct = mapping.contentType;
        if (!defaultResponseContentType) defaultResponseContentType = ct;
        const typeName = resolveSchemaTypeName(
          mapping.schema,
          operationId,
          `${group.statusCode}Response`,
          typeImports,
        );
        if (!contentTypeToResponses[ct]) contentTypeToResponses[ct] = [];
        contentTypeToResponses[ct].push({ status: group.statusCode, typeName });
        statusesWithContent.add(group.statusCode);
      }
    }

    if (
      statusesWithContent.size === explicitStatuses.length &&
      explicitStatuses.length > 0
    ) {
      const mappings: string[] = Object.entries(contentTypeToResponses).map(
        ([ct, entries]) => {
          const union = entries
            .map((e) => `ApiResponse<${e.status}, ${e.typeName}>`)
            .join(" | ");
          return `  "${ct}": ${union};`;
        },
      );
      responseContentTypeCount = mappings.length;
      if (mappings.length > 0) {
        responseMapType = `{\n${mappings.join("\n")}\n}`;
      }
    }
  }

  return {
    defaultRequestContentType,
    defaultResponseContentType,
    requestContentTypeCount,
    requestMapType,
    responseContentTypeCount,
    responseMapType,
    typeImports,
  };
}

/**
 * Generates response handling code and determines return type using discriminated unions
 */
export function generateResponseHandlers(
  operation: OperationObject,
  typeImports: Set<string>,
): ResponseHandlerResult {
  const responseHandlers: string[] = [];
  const unionTypes: string[] = [];

  if (operation.responses) {
    // Sort all response codes (both success and error)
    const responseCodes = Object.keys(operation.responses).filter(
      (code) => code !== "default",
    );
    responseCodes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const code of responseCodes) {
      const response = operation.responses[code] as ResponseObject;
      const contentType = getResponseContentType(response);

      let typeName: null | string = null;
      let parseCode = "undefined";

      if (contentType && response.content?.[contentType]?.schema) {
        const schema = response.content[contentType].schema;

        if (schema["$ref"]) {
          // Use referenced schema
          assert(
            schema["$ref"].startsWith("#/components/schemas/"),
            `Unsupported schema reference: ${schema["$ref"]}`,
          );
          const originalSchemaName = schema["$ref"].split("/").pop();
          assert(originalSchemaName, "Invalid $ref in response schema");
          typeName = sanitizeIdentifier(originalSchemaName);
          typeImports.add(typeName);

          if (contentType.includes("json")) {
            parseCode = `${typeName}.parse(await parseResponseBody(response))`;
          } else {
            parseCode = `await parseResponseBody(response) as ${typeName}`;
          }
        } else {
          // Use generated response schema for inline schemas
          const operationId = operation.operationId;
          assert(operationId, "Invalid operationId");
          const sanitizedOperationId: string = sanitizeIdentifier(operationId);
          const responseTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${code}Response`;
          typeName = responseTypeName;
          typeImports.add(typeName);

          if (contentType.includes("json")) {
            parseCode = `${typeName}.parse(await parseResponseBody(response))`;
          } else {
            parseCode = `await parseResponseBody(response) as ${typeName}`;
          }
        }
      }

      // Build the discriminated union type
      const dataType = typeName || (contentType ? "unknown" : "void");
      unionTypes.push(`ApiResponse<${code}, ${dataType}>`);

      // Generate the response handler with status as const to help with discrimination
      if (typeName || contentType) {
        responseHandlers.push(`    case ${code}: {
      const data = ${parseCode};
      return { status: ${code} as const, data, response };
    }`);
      } else {
        responseHandlers.push(`    case ${code}:
      return { status: ${code} as const, data: undefined, response };`);
      }
    }
  }

  // Don't add a catch-all to the union type to ensure proper narrowing
  const returnType =
    unionTypes.length > 0
      ? unionTypes.join(" | ")
      : "ApiResponse<number, unknown>";

  return { responseHandlers, returnType };
}

/**
 * Resolves a schema to a TypeScript type name
 */
function resolveSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
): string {
  if ("$ref" in schema && schema.$ref) {
    // Use referenced schema
    const originalSchemaName = schema.$ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in schema");
    const typeName = sanitizeIdentifier(originalSchemaName);
    typeImports.add(typeName);
    return typeName;
  } else {
    // Use generated schema for inline schemas
    const sanitizedOperationId = sanitizeIdentifier(operationId);
    const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
    typeImports.add(typeName);
    return typeName;
  }
}
