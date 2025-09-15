import type { ReferenceObject } from "openapi3-ts/oas31";

import type { RecursiveContext } from "./recursive-handlers.js";

import { analyzeRecursiveReference } from "./recursive-handlers.js";
import { sanitizeIdentifier } from "./utils.js";

/**
 * Options for reference handling
 */
export interface ReferenceHandlerOptions {
  currentSchemaName?: string;
  propertyName?: string;
  recursiveContext?: RecursiveContext;
  strictValidation?: boolean;
}

// Import from schema-converter to avoid circular dependencies
interface ZodSchemaResult {
  code: string;
  extensibleEnumValues?: unknown[];
  imports: Set<string>;
}

/**
 * Handle $ref references with support for recursive references
 */
export function handleReference(
  schema: ReferenceObject,
  result: ZodSchemaResult,
  strictValidation = false,
  options: Omit<ReferenceHandlerOptions, "strictValidation"> = {},
): ZodSchemaResult {
  if ("$ref" in schema && schema.$ref) {
    const ref = schema.$ref;
    // Check if it's a local reference to components/schemas
    if (ref.startsWith("#/components/schemas/")) {
      const originalSchemaName = ref.replace("#/components/schemas/", "");
      const schemaName: string = sanitizeIdentifier(originalSchemaName);
      const finalSchemaName = strictValidation
        ? `${schemaName}Strict`
        : schemaName;

      /* Check for recursive references if context is available */
      if (options.recursiveContext) {
        const analysis = analyzeRecursiveReference(
          ref,
          options.recursiveContext,
          options.currentSchemaName,
        );

        if (analysis.isRecursive) {
          /* For recursive references, we don't add imports here as they'll be handled
             by the recursive schema generation */
          result.code = finalSchemaName;
          return result;
        }
      }

      result.imports.add(finalSchemaName);
      result.code = finalSchemaName;
      return result;
    }
  }
  // For non-local refs or other cases, fall back to z.unknown()
  result.code = "z.unknown()";
  return result;
}

/**
 * Enhanced reference handler with full recursive context support
 */
export function handleReferenceWithContext(
  schema: ReferenceObject,
  result: ZodSchemaResult,
  options: ReferenceHandlerOptions = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  return handleReference(schema, result, strictValidation, options);
}
