import type { OpenAPIObject, RequestBodyObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Information about request body types
 */
export type RequestBodyTypeInfo = {
  contentType: string;
  isRequired: boolean;
  typeImports: Set<string>;
  typeName: null | string;
};

/**
 * Generates request body handling code for different content types
 */
export function generateRequestBodyHandling(
  hasBody: boolean,
  requestContentType?: string,
): { bodyContent: string; contentTypeHeader: string } {
  let bodyContent = "";
  let contentTypeHeader = "";

  if (hasBody && requestContentType) {
    // Handle different content types appropriately
    switch (requestContentType) {
      case "application/json":
        bodyContent = `    body: body ? JSON.stringify(body) : undefined,`;
        contentTypeHeader = `    "Content-Type": "application/json",`;
        break;

      case "application/octet-stream":
        bodyContent = `    body: body,`;
        contentTypeHeader = `    "Content-Type": "application/octet-stream",`;
        break;

      case "application/x-www-form-urlencoded":
        bodyContent = `    body: body ? new URLSearchParams(body as Record<string, string>).toString() : undefined,`;
        contentTypeHeader = `    "Content-Type": "application/x-www-form-urlencoded",`;
        break;

      case "application/xml":
        bodyContent = `    body: typeof body === 'string' ? body : String(body),`;
        contentTypeHeader = `    "Content-Type": "application/xml",`;
        break;

      case "multipart/form-data":
        // For multipart/form-data, create FormData and append each field
        // Don't set Content-Type manually - fetch will set it with boundary
        bodyContent = `    body: (() => {
      const formData = new FormData();
      if (body) {
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value);
          }
        });
      }
      return formData;
    })(),`;
        // contentTypeHeader remains empty for multipart/form-data
        break;

      case "text/plain":
        bodyContent = `    body: typeof body === 'string' ? body : String(body),`;
        contentTypeHeader = `    "Content-Type": "text/plain",`;
        break;

      default:
        // For unknown content types, try to handle as string or fall back to JSON
        bodyContent = `    body: typeof body === 'string' ? body : JSON.stringify(body),`;
        contentTypeHeader = `    "Content-Type": "${requestContentType}",`;
    }
  }

  return { bodyContent, contentTypeHeader };
}

/**
 * Extracts the request body content type from the OpenAPI spec
 *
 * NOTE: Currently, we only support a single content type per request body.
 * If multiple content types are specified in the OpenAPI spec, we select
 * one based on priority order. This is a known limitation.
 */
export function getRequestBodyContentType(
  requestBody: RequestBodyObject,
): string {
  if (!requestBody.content) {
    return "application/json"; // fallback default
  }

  // LIMITATION: We don't support multiple content types for the same request.
  // We prioritize common content types and select the first available one.
  const preferredTypes = [
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
    "application/xml",
    "application/octet-stream",
  ];

  // Check if any of the preferred types are available
  for (const type of preferredTypes) {
    if (requestBody.content[type]) {
      return type;
    }
  }

  // Return the first available content type
  const availableTypes = Object.keys(requestBody.content);
  return availableTypes[0] || "application/json";
}

/**
 * Resolves request body schema and extracts type information
 */
export function resolveRequestBodyType(
  requestBody: RequestBodyObject,
  operationId: string,
  doc: OpenAPIObject,
): RequestBodyTypeInfo {
  // Check if request body is required (default is false)
  const isRequired = requestBody.required === true;
  const contentType = getRequestBodyContentType(requestBody);

  // Look for the determined content type
  const content = requestBody.content?.[contentType];
  if (!content?.schema) {
    return {
      contentType,
      isRequired,
      typeImports: new Set<string>(),
      typeName: null,
    };
  }

  const schema = content.schema;

  // If it's a reference to a schema, use that as the type name
  if (schema["$ref"]) {
    const originalTypeName = schema["$ref"].split("/").pop();
    const typeName = originalTypeName
      ? sanitizeIdentifier(originalTypeName)
      : null;
    return {
      contentType,
      isRequired,
      typeImports: new Set([typeName || ""]),
      typeName: typeName || null,
    };
  }

  // For inline schemas, use the pre-generated request schema
  // The request schema will be generated as {operationId}Request in the main generator
  const sanitizedOperationId: string = sanitizeIdentifier(operationId);
  const requestTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}Request`;
  return {
    contentType,
    isRequired,
    typeImports: new Set([requestTypeName]),
    typeName: requestTypeName,
  };
}
