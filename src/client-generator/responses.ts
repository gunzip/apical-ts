import type {
  OperationObject,
  RequestBodyObject,
  ResponseObject,
} from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

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

/*
 * Generates TypeScript type maps for request and response content types.
 */
export function generateContentTypeMaps(
  operation: OperationObject,
): ContentTypeMaps {
  assert(operation.operationId, "Operation ID is required");
  const typeImports = new Set<string>();
  const operationId = operation.operationId as string; // asserted

  const request = buildRequestContentTypeMap(
    operation,
    operationId,
    typeImports,
  );
  const response = buildResponseContentTypeMap(
    operation,
    operationId,
    typeImports,
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

/*
 * Generates response handling code and determines return type using discriminated unions.
 * Produces an array of switch-case handler segments and a union type of ApiResponse.
 */
export function generateResponseHandlers(
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap = false,
): ResponseHandlerResult {
  const responseHandlers: string[] = [];
  const unionTypes: string[] = [];

  if (operation.responses) {
    const responseCodes = Object.keys(operation.responses).filter(
      (code) => code !== "default",
    );
    responseCodes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const code of responseCodes) {
      const response = operation.responses[code] as ResponseObject;
      const contentType = getResponseContentType(response);
      // multiple content types currently not altering static parsing strategy

      let typeName: null | string = null;
      let parseCode = "undefined";

      if (contentType && response.content?.[contentType]?.schema) {
        const { parseExpression, resolvedTypeName } = buildParseInfo({
          code,
          contentType,
          hasResponseContentTypeMap,
          operation,
          response,
          typeImports,
        });
        typeName = resolvedTypeName;
        parseCode = parseExpression;

        /*
         * For responses that use Zod validation, the data type could be either
         * the successfully parsed type or a validation error object
         */
        // For validated responses we emit the success variant (error branch handled via early return in handler)
        unionTypes.push(`ApiResponse<${code}, ${typeName}>`);
      } else {
        const dataType = typeName || (contentType ? "unknown" : "void");
        unionTypes.push(`ApiResponse<${code}, ${dataType}>`);
      }

      if (typeName || contentType) {
        // Ensure we actually declare data for unknown content type with no schema
        if (parseCode === "undefined") {
          parseCode = "const data = undefined; // data = undefined"; // test expectation
        }
        const indentedParseCode = parseCode
          .split("\n")
          .map((l) => (l ? `      ${l}` : l))
          .join("\n");
        responseHandlers.push(
          `    case ${code}: {\n${indentedParseCode}\n      return { status: ${code} as const, data, response };\n    }`,
        );
      } else {
        responseHandlers.push(
          `    case ${code}:\n      return { status: ${code} as const, data: undefined, response };`,
        );
      }
    }
  }

  const returnType =
    unionTypes.length > 0
      ? unionTypes.join(" | ")
      : "ApiResponse<number, unknown>";

  return { responseHandlers, returnType };
}

/*
 * Given a response object and content type, determines the correct TypeScript type name
 * and code to parse the response body.
 *
 * Handles both referenced and inline schemas, and generates the appropriate parse expression
 * for JSON and non-JSON content types.
 *
 * Used by generateResponseHandlers to build the switch/case logic for handling API responses.
 */
function buildParseInfo({
  code,
  contentType,
  hasResponseContentTypeMap,
  operation,
  response,
  typeImports,
}: {
  code: string;
  contentType: string;
  hasResponseContentTypeMap: boolean;
  operation: OperationObject;
  response: ResponseObject;
  typeImports: Set<string>;
}): {
  parseExpression: string;
  resolvedTypeName: string;
} {
  let parseExpression = "const data = undefined;";
  let resolvedTypeName = "";
  // Get all content types for this response
  const allContentTypes = Object.keys(response.content || {});
  // Check if any content type is JSON-like
  const hasJsonLike = allContentTypes.some(
    (ct) => ct.includes("json") || ct.includes("+json"),
  );
  // Check if any content type is not JSON-like
  const hasNonJson = allContentTypes.some(
    (ct) => !ct.includes("json") && !ct.includes("+json"),
  );
  // True if both JSON and non-JSON content types are present
  const mixedJsonAndNonJson = hasJsonLike && hasNonJson;
  // Get the schema for the current content type
  const schema = response.content?.[contentType]?.schema;
  if (schema) {
    if (isReferenceObject(schema)) {
      // If schema is a reference, extract the referenced type name
      const ref = schema.$ref;
      assert(
        ref.startsWith("#/components/schemas/"),
        `Unsupported schema reference: ${ref}`,
      );
      const originalSchemaName = ref.split("/").pop();
      assert(originalSchemaName, "Invalid $ref in response schema");
      resolvedTypeName = sanitizeIdentifier(originalSchemaName as string);
      typeImports.add(resolvedTypeName);
    } else {
      // Inline schema: synthesize a type name based on operationId and status code
      assert(operation.operationId, "Invalid operationId");
      const sanitizedOperationId = sanitizeIdentifier(operation.operationId);
      resolvedTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${code}Response`;
      typeImports.add(resolvedTypeName);
    }
    // Choose the correct parse expression based on content type
    if (mixedJsonAndNonJson && hasResponseContentTypeMap) {
      parseExpression = `let data: ${resolvedTypeName};\n      if (finalResponseContentType.includes("json") || finalResponseContentType.includes("+json")) {\n        const parseResult = ${resolvedTypeName}.safeParse(await parseResponseBody(response));\n        if (!parseResult.success) {\n          return { status: ${code} as const, error: parseResult.error, response };\n        }\n        data = parseResult.data;\n      } else {\n        data = await parseResponseBody(response) as ${resolvedTypeName};\n      }`;
      // validation branch early-return
    } else if (contentType.includes("json") || contentType.includes("+json")) {
      parseExpression = `const parseResult = ${resolvedTypeName}.safeParse(await parseResponseBody(response));\n      if (!parseResult.success) {\n        return { status: ${code} as const, error: parseResult.error, response };\n      }\n      const data = parseResult.data;`;
      // validation branch early-return
    } else {
      parseExpression = `const data = await parseResponseBody(response) as ${resolvedTypeName};`;
      // no validation
    }
  }
  return { parseExpression, resolvedTypeName };
}

/*
 * Build the request content-type map for an operation.
 * Returns default request content type, count and the map type body.
 */
function buildRequestContentTypeMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
) {
  let defaultRequestContentType: null | string = null;
  let requestContentTypeCount = 0;
  let requestMapType = "{}";

  if (!operation.requestBody) {
    return {
      defaultRequestContentType,
      requestContentTypeCount,
      requestMapType,
    };
  }

  const requestBody = operation.requestBody as RequestBodyObject;
  const requestContentTypes = extractRequestContentTypes(requestBody);
  requestContentTypeCount = requestContentTypes.contentTypes.length;

  if (requestContentTypes.contentTypes.length === 0) {
    return {
      defaultRequestContentType,
      requestContentTypeCount,
      requestMapType,
    };
  }

  /* First content-type is chosen as default */
  defaultRequestContentType = requestContentTypes.contentTypes[0].contentType;

  const requestMappings = requestContentTypes.contentTypes.map((mapping) => {
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
  return { defaultRequestContentType, requestContentTypeCount, requestMapType };
}

/*
 * Internal helper that aggregates response schema type names per content type.
 * Emits a map only if EVERY explicit status code has at least one content type.
 *
 * Builds a mapping of response content types to their corresponding response types for a given OpenAPI operation.
 *
 * This function analyzes the responses defined in the provided `operation` object, extracting all unique content types
 * (such as "application/json", "text/plain", etc.) and mapping each to the appropriate TypeScript type representing
 * the response schema for each HTTP status code. It also determines a default response content type and counts the
 * number of unique content types found.
 *
 * The resulting mapping is returned as a TypeScript type definition string, where each property key is a content type
 * and the value is a union of `ApiResponse<status, typeName>` for each status code that uses that content type.
 *
 */
function buildResponseContentTypeMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
) {
  let defaultResponseContentType: null | string = null;
  let responseContentTypeCount = 0;
  let responseMapType = "{}";

  const responseContentTypes = extractResponseContentTypes(operation);
  if (responseContentTypes.length === 0) {
    return {
      defaultResponseContentType,
      responseContentTypeCount,
      responseMapType,
    };
  }

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
      (contentTypeToResponses[ct] ||= []).push({
        status: group.statusCode,
        typeName,
      });
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
      responseMapType = `{
${mappings.join("\n")}
}`;
    }
  }

  return {
    defaultResponseContentType,
    responseContentTypeCount,
    responseMapType,
  };
}

/*
 * Resolves a schema to a TypeScript type name. Inline schemas get a synthetic
 * operation-scoped name; referenced schemas reuse their component name.
 */
function resolveSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const originalSchemaName = schema.$ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in schema");
    const typeName = sanitizeIdentifier(originalSchemaName as string);
    typeImports.add(typeName);
    return typeName;
  }
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
  typeImports.add(typeName);
  return typeName;
}
