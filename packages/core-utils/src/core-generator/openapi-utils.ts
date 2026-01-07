import type {
  OpenAPIObject,
  ResponseObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

/**
 * Determines if an object is a plain OpenAPI schema object or reference object
 */
export function isPlainSchemaObject(obj: unknown): obj is SchemaObject {
  if (!obj || typeof obj !== "object") return false;
  // Check if it's a reference object (contains $ref)
  if (isReferenceObject(obj)) {
    return true;
  }
  // Must have at least one OpenAPI schema property
  return (
    "type" in obj ||
    "allOf" in obj ||
    "anyOf" in obj ||
    "oneOf" in obj ||
    "properties" in obj ||
    "additionalProperties" in obj ||
    "array" in obj ||
    "enum" in obj ||
    "const" in obj
  );
}

/**
 * Resolves a response reference within an OpenAPI document
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
    /* eslint-disable-next-line no-console */
    console.warn(
      `⚠️ Nested response reference not resolved: ${ref} -> ${response.$ref}`,
    );
    return undefined;
  }

  return response;
}
