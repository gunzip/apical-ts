import type {
  OpenAPIObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { resolveResponseReference } from "./openapi-utils.js";
import { forEachOperation } from "./operation-utils.js";

/**
 * Extracts request schemas from operations for inline request body schemas
 *
 * @example
 * ```javascript
 * const openApiDoc = {
 *   paths: {
 *     '/users': {
 *       post: {
 *         operationId: 'createUser',
 *         requestBody: {
 *           content: {
 *             'application/json': {
 *               schema: {
 *                 type: 'object',
 *                 properties: { name: { type: 'string' } }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const schemas = extractRequestSchemas(openApiDoc);
 * // Result: Map with entry 'CreateUserRequest' -> schema object
 * ```
 */
export function extractRequestSchemas(
  openApiDoc: OpenAPIObject,
): Map<string, SchemaObject> {
  const requestSchemas = new Map<string, SchemaObject>();

  forEachOperation(openApiDoc, (operation) => {
    if (!operation.requestBody) return;

    // Handle both direct RequestBodyObject and ReferenceObject
    let requestBody: RequestBodyObject;
    if (isReferenceObject(operation.requestBody)) {
      // Skip reference objects for now - we only want inline schemas
      return;
    } else {
      requestBody = operation.requestBody;
    }

    const supportedContentTypes = [
      "application/json",
      "multipart/form-data",
      "application/x-www-form-urlencoded",
      "application/octet-stream",
      "text/csv",
    ];

    assert(operation.operationId, "Operation ID is missing");

    for (const contentType of supportedContentTypes) {
      const content = requestBody.content?.[contentType];
      if (content?.schema && !isReferenceObject(content.schema)) {
        // Only extract inline schemas, not $ref schemas
        const requestTypeName = `${sanitizeIdentifier(operation.operationId)}Request`;
        requestSchemas.set(requestTypeName, content.schema);
        break; // Only process the first matching content type
      }
    }
  });

  return requestSchemas;
}

/**
 * Extracts response schemas from operations for inline response schemas
 *
 * @example
 * ```javascript
 * const openApiDoc = {
 *   paths: {
 *     '/users/{id}': {
 *       get: {
 *         operationId: 'getUser',
 *         responses: {
 *           '200': {
 *             content: {
 *               'application/json': {
 *                 schema: {
 *                   type: 'object',
 *                   properties: { id: { type: 'string' }, name: { type: 'string' } }
 *                 }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const schemas = extractResponseSchemas(openApiDoc);
 * // Result: Map with entry 'GetUser200Response' -> schema object
 * ```
 */
export function extractResponseSchemas(
  openApiDoc: OpenAPIObject,
): Map<string, SchemaObject> {
  const responseSchemas = new Map<string, SchemaObject>();

  forEachOperation(openApiDoc, (operation) => {
    if (!operation.responses) return;

    const operationId = operation.operationId;

    assert(operationId, "Operation ID is missing");

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      // Process all status codes, including default responses

      // Handle both direct ResponseObject and ReferenceObject
      let responseObj: ResponseObject;
      if (isReferenceObject(response)) {
        // Resolve the response reference
        const resolved = resolveResponseReference(response.$ref, openApiDoc);
        if (!resolved) {
          /* eslint-disable-next-line no-console */
          console.warn(
            `⚠️ Could not resolve response reference: ${response.$ref}`,
          );
          continue;
        }
        responseObj = resolved;
      } else {
        responseObj = response;
      }

      if (!responseObj.content) continue;

      // Check for various content types
      const supportedContentTypes = [
        "application/json",
        "application/problem+json",
        "application/octet-stream",
        "multipart/form-data",
        "application/pdf",
      ];

      for (const contentType of Object.keys(responseObj.content)) {
        if (
          supportedContentTypes.includes(contentType) ||
          contentType.includes("+json")
        ) {
          const content = responseObj.content[contentType];
          if (content?.schema && !isReferenceObject(content.schema)) {
            // Only extract inline schemas, not $ref schemas
            const sanitizedOperationId = sanitizeIdentifier(operationId);
            const suffix =
              statusCode === "default"
                ? "DefaultResponse"
                : `${statusCode}Response`;
            const responseTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
            responseSchemas.set(responseTypeName, content.schema);
          }
          break; // Only process the first matching content type
        }
      }
    }
  });

  return responseSchemas;
}
