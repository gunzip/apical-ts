/**
 * Utility functions for string manipulation and validation
 */

import type { OpenAPIObject, ResponseObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

/**
 * Generates URL path with parameter interpolation
 */
export function generatePathInterpolation(
  pathKey: string,
  pathParams: import("openapi3-ts/oas31").ParameterObject[],
): string {
  let finalPath = pathKey;
  for (const param of pathParams) {
    const varName = toCamelCase(param.name);
    finalPath = finalPath.replace(`{${param.name}}`, `\${${varName}}`);
  }
  return finalPath;
}

/**
 * Determines if a response content type should be parsed as JSON
 */
export function getResponseContentType(
  response: import("openapi3-ts/oas31").ResponseObject,
): null | string {
  if (!response.content) return null;

  // Check for JSON content types in order of preference
  const jsonTypes = ["application/json", "application/problem+json"];
  for (const type of jsonTypes) {
    if (response.content[type]) return type;
  }

  // Check for other JSON-like content types
  for (const [contentType] of Object.entries(response.content)) {
    if (contentType.includes("+json")) return contentType;
  }

  // Return the first content type if no JSON found
  const contentTypes = Object.keys(response.content);
  return contentTypes.length > 0 ? contentTypes[0] : null;
}

/**
 * Resolves a response (either direct ResponseObject or ReferenceObject) to a ResponseObject
 * @param responseOrRef The response object or reference to resolve
 * @param doc The OpenAPI document for resolving references (optional)
 * @returns The resolved ResponseObject or undefined if resolution fails
 */
export function resolveResponse(
  responseOrRef: ResponseObject | { $ref: string },
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
      // Skip reference objects if no document to resolve against
      return undefined;
    }
  } else {
    return responseOrRef;
  }
}

/**
 * Resolves a response reference within an OpenAPI document
 * @param ref The reference string (e.g., "#/components/responses/DocumentResponse")
 * @param doc The OpenAPI document containing the referenced response
 * @returns The resolved ResponseObject or undefined if not found
 */
export function resolveResponseReference(
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
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ Nested response reference not resolved: ${ref} -> ${response.$ref}`,
    );
    return undefined;
  }

  return response;
}

/**
 * Converts kebab-case or similar to camelCase.
 * Preserves already camelCased parts.
 */
export function toCamelCase(str: string): string {
  // Split on non-alphanumeric characters (-, _, spaces, etc.) and remove empty parts
  const parts = str.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "";

  // If only one part (no separators), preserve original casing but ensure first char is lowercase
  if (parts.length === 1) {
    const first = parts[0];
    return first.charAt(0).toLowerCase() + first.slice(1);
  }

  // Take the first part and lowercase it entirely
  const first = parts[0];
  const firstLower = first.toLowerCase();

  // For subsequent parts, capitalize first letter and lowercase the rest
  return (
    firstLower +
    parts
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  );
}

/**
 * Creates a valid JavaScript variable name from any string
 */
export function toValidVariableName(str: string): string {
  // Replace any non-alphanumeric characters with underscore, then camelCase
  return str
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .replace(/_([a-zA-Z])/g, (_, letter) => letter.toUpperCase()); // camelCase after underscore
}
