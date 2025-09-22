import type { OpenAPIObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

/*
 * Resolves requestBodies references by replacing $ref pointers with inline content.
 * This preprocessing step allows the existing client and server generators to work
 * without modifications, as they only need to handle inline request body definitions.
 *
 * For each requestBodies reference found in operation requestBody, this function:
 * 1. Looks up the requestBody definition in components/requestBodies
 * 2. Replaces the $ref with the actual requestBody content
 * 3. Updates all references across the entire OpenAPI document
 */
export function resolveRequestBodies(openApiDoc: OpenAPIObject): number {
  // Access requestBodies safely - extend components type for requestBodies support
  const components = openApiDoc.components;
  if (!components?.requestBodies) {
    return 0; // No requestBodies to resolve
  }

  const requestBodies = components.requestBodies;
  let resolvedCount = 0;

  const refPrefix = "#/components/requestBodies/";

  /* Walk entire document and replace requestBodies $ref with inline content */
  const visit = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (isReferenceObject(obj)) {
        const ref: string = obj.$ref;
        if (ref.startsWith(refPrefix)) {
          const requestBodyName = ref.substring(refPrefix.length);
          const requestBody = requestBodies[requestBodyName];

          if (requestBody) {
            // Replace the $ref with the actual requestBody content
            delete (obj as Record<string, unknown>).$ref;

            // Copy all properties from the requestBody to the current object
            for (const [key, value] of Object.entries(requestBody)) {
              obj[key] = value;
            }

            resolvedCount++;
          } else {
            /* eslint-disable-next-line no-console */
            console.warn(`⚠️ Could not resolve requestBody reference: ${ref}`);
          }
        }
      }
      for (const value of Object.values(obj)) visit(value);
    }
  };

  visit(openApiDoc);
  return resolvedCount;
}
