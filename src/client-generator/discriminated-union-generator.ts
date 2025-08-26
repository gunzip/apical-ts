/* Generator for discriminated union response types */

import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { getResponseContentType } from "./utils.js";
import { resolveResponseTypeName } from "./response-analysis.js";
import type {
  DiscriminatedResponseType,
  DiscriminatedUnionConfig,
  DiscriminatedUnionResult,
} from "./models/discriminated-union-models.js";

/*
 * Generates discriminated union response types for an operation
 */
export function generateDiscriminatedUnionTypes(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
): DiscriminatedUnionResult {
  const responseTypes: DiscriminatedResponseType[] = [];
  
  if (operation.responses) {
    /* Process each status code */
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") continue;
      
      const responseObj = response as ResponseObject;
      
      /* Handle responses with content */
      if (responseObj.content) {
        for (const [contentType, mediaType] of Object.entries(responseObj.content)) {
          if (mediaType.schema) {
            const dataType = resolveResponseTypeName(
              mediaType.schema,
              operation,
              statusCode,
              typeImports,
            );
            
            responseTypes.push({
              status: statusCode,
              contentType,
              dataType,
            });
          }
        }
      } else {
        /* Handle responses without content (e.g., 204 No Content) */
        responseTypes.push({
          status: statusCode,
          contentType: "",
          dataType: "void",
        });
      }
    }
  }
  
  const config: DiscriminatedUnionConfig = {
    operationId,
    responseTypes,
    includeParse: responseTypes.some(rt => rt.contentType !== ""),
  };
  
  return generateDiscriminatedUnionFromConfig(config, typeImports);
}

/*
 * Generates discriminated union types from configuration
 */
export function generateDiscriminatedUnionFromConfig(
  config: DiscriminatedUnionConfig,
  typeImports: Set<string>,
): DiscriminatedUnionResult {
  const { operationId, responseTypes } = config;
  
  const unionTypeName = `${sanitizeIdentifier(operationId).charAt(0).toUpperCase()}${sanitizeIdentifier(operationId).slice(1)}Response`;
  const responseMapName = `${sanitizeIdentifier(operationId).charAt(0).toUpperCase()}${sanitizeIdentifier(operationId).slice(1)}ResponseMap`;
  
  /* Generate union type components */
  const unionComponents: string[] = [];
  const responseMapEntries: string[] = [];
  
  for (const responseType of responseTypes) {
    if (responseType.contentType === "") {
      /* Void response */
      unionComponents.push(
        `{ status: ${responseType.status}; contentType: ""; data: void }`
      );
    } else {
      /* Response with content */
      unionComponents.push(
        `{ status: ${responseType.status}; contentType: "${responseType.contentType}"; data: import("zod").infer<typeof ${responseType.dataType}> }`
      );
      
      /* Add to response map */
      responseMapEntries.push(`  "${responseType.contentType}": ${responseType.dataType},`);
    }
  }
  
  /* Generate union type definition */
  const unionTypeDefinition = unionComponents.length > 0
    ? `export type ${unionTypeName} =\n  | ${unionComponents.join("\n  | ")};`
    : `export type ${unionTypeName} = never;`;
  
  /* Generate response map type */
  const responseMapType = responseMapEntries.length > 0
    ? `export const ${responseMapName} = {\n${responseMapEntries.join("\n")}\n} as const;`
    : `export const ${responseMapName} = {} as const;`;
  
  /* Remove z import since we're using import qualifier */
  
  return {
    unionTypeName,
    unionTypeDefinition,
    responseMapType,
    responseMapName,
    typeImports,
  };
}

/*
 * Extracts all (status, contentType) pairs from operation responses
 */
export function extractResponseContentTypePairs(
  operation: OperationObject,
): Array<{ status: string; contentType: string }> {
  const pairs: Array<{ status: string; contentType: string }> = [];
  
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") continue;
      
      const responseObj = response as ResponseObject;
      
      if (responseObj.content) {
        for (const contentType of Object.keys(responseObj.content)) {
          pairs.push({
            status: statusCode,
            contentType,
          });
        }
      } else {
        /* No content responses like 204 */
        pairs.push({
          status: statusCode,
          contentType: "",
        });
      }
    }
  }
  
  return pairs;
}