import type {
  OpenAPIObject,
  OperationObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
} from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { ContentTypeMapping } from "./types.js";

import { resolveResponseReference } from "../core-generator/openapi-utils.js";

/**
 * Content type mapping with schema information
 */
/**
 * Request body content types for an operation
 */
export interface RequestContentTypes {
  contentTypes: ContentTypeMapping[];
  isRequired: boolean;
}

/**
 * Response content types for a specific status code
 */
export interface ResponseContentTypes {
  contentTypes: ContentTypeMapping[];
  statusCode: string;
}

/**
 * Extracts all request content types and their schemas from a request body
 */
export function extractRequestContentTypes(
  requestBody: RequestBodyObject,
): RequestContentTypes {
  const contentTypes: ContentTypeMapping[] = [];
  const isRequired = requestBody.required === true;

  if (requestBody.content) {
    for (const [contentType, mediaType] of Object.entries(
      requestBody.content,
    )) {
      if (mediaType.schema) {
        contentTypes.push({
          contentType,
          schema: mediaType.schema,
        });
      }
    }
  }

  return { contentTypes, isRequired };
}

/**
 * Extracts all response content types and their schemas from operation responses
 */
export function extractResponseContentTypes(
  operation: OperationObject,
  doc?: OpenAPIObject,
): ResponseContentTypes[] {
  const responseContentTypes: ResponseContentTypes[] = [];

  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") continue;

      const responseObj = resolveResponse(response, doc);
      if (!responseObj) continue;

      const contentTypes: ContentTypeMapping[] = [];

      if (responseObj.content) {
        for (const [contentType, mediaType] of Object.entries(
          responseObj.content,
        )) {
          if (mediaType.schema) {
            contentTypes.push({
              contentType,
              schema: mediaType.schema,
            });
          }
        }
      }

      if (contentTypes.length > 0) {
        responseContentTypes.push({
          contentTypes,
          statusCode,
        });
      }
    }
  }

  return responseContentTypes;
}

/**
 * Extracts all server URLs from OpenAPI spec
 */
export function extractServerUrls(doc: OpenAPIObject): string[] {
  if (doc.servers && doc.servers.length > 0) {
    return doc.servers
      .map((server) => server.url || "")
      .filter((url) => url !== "");
  }
  return [];
}

/**
 * Resolves a response (either direct ResponseObject or ReferenceObject) to a ResponseObject
 */
export function resolveResponse(
  responseOrRef: ReferenceObject | ResponseObject,
  doc?: OpenAPIObject,
): ResponseObject | undefined {
  if (isReferenceObject(responseOrRef)) {
    if (doc) {
      const resolved = resolveResponseReference(responseOrRef.$ref, doc);
      if (!resolved) {
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️ Could not resolve response reference: ${responseOrRef.$ref}`,
        );
        return undefined;
      }
      return resolved;
    } else {
      /* Skip reference objects if no document to resolve against */
      return undefined;
    }
  } else {
    return responseOrRef;
  }
}
