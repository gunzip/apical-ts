import type { OperationObject, ResponseObject, RequestBodyObject } from "openapi3-ts/oas31";

import assert from "assert";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { getResponseContentType } from "./utils.js";
import {
  extractRequestContentTypes,
  extractResponseContentTypes,
  type ContentTypeMapping,
  type RequestContentTypes,
  type ResponseContentTypes,
} from "./operation-extractor.js";

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
 * Result of generating content type maps
 */
export type ContentTypeMaps = {
  requestMapType: string;
  responseMapType: string;
  defaultRequestContentType: string | null;
  defaultResponseContentType: string | null;
  typeImports: Set<string>;
};

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

/**
 * Generates TypeScript type maps for request and response content types
 */
export function generateContentTypeMaps(
  operation: OperationObject,
): ContentTypeMaps {
  assert(operation.operationId, "Operation ID is required");
  const operationId = operation.operationId;
  const typeImports = new Set<string>();
  
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const operationName = sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1);

  // Generate request map type
  let requestMapType = "{}";
  let defaultRequestContentType: string | null = null;

  if (operation.requestBody) {
    const requestBody = operation.requestBody as RequestBodyObject;
    const requestContentTypes = extractRequestContentTypes(requestBody);
    
    if (requestContentTypes.contentTypes.length > 0) {
      defaultRequestContentType = requestContentTypes.contentTypes[0].contentType;
      
      const requestMappings = requestContentTypes.contentTypes.map((mapping) => {
        const typeName = resolveSchemaTypeName(
          mapping.schema,
          operationId,
          "Request",
          typeImports
        );
        return `  "${mapping.contentType}": ${typeName};`;
      });
      
      requestMapType = `{\n${requestMappings.join("\n")}\n}`;
    }
  }

  // Generate response map type
  let responseMapType = "{}";
  let defaultResponseContentType: string | null = null;

  const responseContentTypes = extractResponseContentTypes(operation);
  if (responseContentTypes.length > 0) {
    const responseMappings: string[] = [];
    
    for (const responseGroup of responseContentTypes) {
      if (responseGroup.contentTypes.length > 0) {
        if (!defaultResponseContentType) {
          defaultResponseContentType = responseGroup.contentTypes[0].contentType;
        }
        
        for (const mapping of responseGroup.contentTypes) {
          const typeName = resolveSchemaTypeName(
            mapping.schema,
            operationId,
            `${responseGroup.statusCode}Response`,
            typeImports
          );
          responseMappings.push(`  "${mapping.contentType}": ApiResponse<${responseGroup.statusCode}, ${typeName}>;`);
        }
      }
    }
    
    if (responseMappings.length > 0) {
      responseMapType = `{\n${responseMappings.join("\n")}\n}`;
    }
  }

  return {
    requestMapType,
    responseMapType,
    defaultRequestContentType,
    defaultResponseContentType,
    typeImports,
  };
}
