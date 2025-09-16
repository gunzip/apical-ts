import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { isReferenceObject } from "openapi3-ts/oas31";

import assert from "assert";

/**
 * Content type mapping with schema information
 */
export interface ContentTypeMapping {
  contentType: string;
  schema: SchemaObject | { $ref: string };
}

/**
 * Metadata for an OpenAPI operation
 */
export interface OperationMetadata {
  method: string;
  operation: OperationObject;
  operationId: string;
  pathKey: string;
  pathLevelParameters: (ParameterObject | ReferenceObject)[];
}

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
 * Extracts all operations from the OpenAPI document
 */
export function extractAllOperations(doc: OpenAPIObject): OperationMetadata[] {
  const operations: OperationMetadata[] = [];

  if (doc.paths) {
    for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
      const pathItemObj = pathItem;
      const pathLevelParameters = (pathItemObj.parameters ||
        []) as ParameterObject[];

      // Define the HTTP methods we support with their corresponding operations
      const httpMethods: {
        method: string;
        operation: OperationObject | undefined;
      }[] = [
        { method: "get", operation: pathItemObj.get },
        { method: "post", operation: pathItemObj.post },
        { method: "put", operation: pathItemObj.put },
        { method: "delete", operation: pathItemObj.delete },
        { method: "patch", operation: pathItemObj.patch },
      ];

      for (const { method, operation } of httpMethods) {
        if (operation) {
          // operationId should now always exist after applyGeneratedOperationIds
          assert(operation.operationId, "Operation ID is required");
          const operationId = operation.operationId;

          // Skip operations that result in empty sanitized IDs
          operations.push({
            method,
            operation,
            operationId,
            pathKey,
            pathLevelParameters,
          });
        }
      }
    }
  }

  return operations;
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
 * Resolves a response reference within an OpenAPI document
 * @param ref The reference string (e.g., "#/components/responses/DocumentResponse") 
 * @param doc The OpenAPI document containing the referenced response
 * @returns The resolved ResponseObject or undefined if not found
 */
function resolveResponseReference(
  ref: string,
  doc: OpenAPIObject,
): ResponseObject | undefined {
  if (!ref.startsWith("#/components/responses/")) {
    return undefined;
  }

  const responseName = ref.replace("#/components/responses/", "");
  const response = doc.components?.responses?.[responseName];
  
  if (!response) {
    return undefined;
  }

  // The resolved response should be a ResponseObject, not a ReferenceObject
  // If it's still a reference, we'd need recursive resolution, but OpenAPI bundling
  // should have resolved this already
  if (isReferenceObject(response)) {
    console.warn(`⚠️ Nested response reference not resolved: ${ref} -> ${response.$ref}`);
    return undefined;
  }

  return response;
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

      let responseObj: ResponseObject;
      
      /* Handle both direct ResponseObject and ReferenceObject */
      if (isReferenceObject(response)) {
        /* Resolve response reference if document is available */
        if (doc) {
          const resolved = resolveResponseReference(response.$ref, doc);
          if (!resolved) {
            console.warn(`⚠️ Could not resolve response reference: ${response.$ref}`);
            continue;
          }
          responseObj = resolved;
        } else {
          /* Skip reference objects if no document to resolve against */
          continue;
        }
      } else {
        responseObj = response;
      }

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
