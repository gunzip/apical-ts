import type { ReferenceObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "./utils.js";

// Import from schema-converter to avoid circular dependencies
type ZodSchemaResult = {
  code: string;
  extensibleEnumValues?: any[];
  imports: Set<string>;
};

/**
 * Handle $ref references
 */
export function handleReference(
  schema: ReferenceObject,
  result: ZodSchemaResult,
): ZodSchemaResult {
  if ("$ref" in schema && schema.$ref) {
    const ref = schema.$ref;
    // Check if it's a local reference to components/schemas
    if (ref.startsWith("#/components/schemas/")) {
      const originalSchemaName = ref.replace("#/components/schemas/", "");
      const schemaName: string = sanitizeIdentifier(originalSchemaName);
      result.imports.add(schemaName);
      result.code = schemaName;
      return result;
    }
  }
  // For non-local refs or other cases, fall back to z.unknown()
  result.code = "z.unknown()";
  return result;
}
