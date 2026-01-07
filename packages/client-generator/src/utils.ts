/**
 * Utility functions for string manipulation and validation
 */

import type { ParameterObject } from "openapi3-ts/oas31";

import { handleReservedKeyword } from "@apical-ts/core-utils/shared";

/**
 * Generates URL path with parameter interpolation using proper serialization
 */
export function generatePathInterpolation(
  pathKey: string,
  pathParams: ParameterObject[],
): string {
  let finalPath = pathKey;
  for (const param of pathParams) {
    /* Extract OpenAPI serialization options */
    const style = param.style || "simple";
    const explode = param.explode !== false; // Default to true per OpenAPI spec

    const serializedValue = `serializePathParam("${param.name}", params.path["${param.name}"], { style: "${style}", explode: ${explode} })`;
    finalPath = finalPath.replace(`{${param.name}}`, `\${${serializedValue}}`);
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
 * Creates a valid JavaScript variable name from any string
 */
export function toValidVariableName(str: string): string {
  // Replace any non-alphanumeric characters with underscore, then camelCase
  const result = str
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_+|_+$/g, "") // Remove leading/trailing underscores
    .replace(/_([a-zA-Z])/g, (_, letter) => letter.toUpperCase()); // camelCase after underscore

  return handleReservedKeyword(result);
}
