import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import assert from "assert";

/**
 * Content type mapping with schema information
 */
export type ContentTypeMapping = {
  contentType: string;
  schema: SchemaObject | { $ref: string };
};

/**
 * Metadata for an OpenAPI operation
 */
export type OperationMetadata = {
  method: string;
  operation: OperationObject;
  operationId: string;
  pathKey: string;
  pathLevelParameters: (ParameterObject | ReferenceObject)[];
};

/**
 * Request body content types for an operation
 */
export type RequestContentTypes = {
  contentTypes: ContentTypeMapping[];
  isRequired: boolean;
};

/**
 * Response content types for a specific status code
 */
export type ResponseContentTypes = {
  contentTypes: ContentTypeMapping[];
  statusCode: string;
};

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
 * Extracts all response content types and their schemas from operation responses
 */
export function extractResponseContentTypes(
  operation: OperationObject,
): ResponseContentTypes[] {
  const responseContentTypes: ResponseContentTypes[] = [];

  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") continue;

      const responseObj = response as ResponseObject;
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
