import type { ReferenceObject } from "openapi3-ts/oas31";

import type { RecursiveContext } from "./recursive-handlers.js";

import { analyzeRecursiveReference } from "./recursive-handlers.js";
import { sanitizeIdentifier } from "./utils.js";

/**
 * Options for reference handling
 */
interface ReferenceHandlerOptions {
  currentSchemaName?: string;
  propertyName?: string;
  recursiveContext?: RecursiveContext;
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
function handleReference(
  schema: ReferenceObject,
  result: ZodSchemaResult,
  options: ReferenceHandlerOptions = {},
): ZodSchemaResult {
  if ("$ref" in schema && schema.$ref) {
    const ref = schema.$ref;
    // Check if it's a local reference to components/schemas
    if (ref.startsWith("#/components/schemas/")) {
      const originalSchemaName = ref.replace("#/components/schemas/", "");
      const schemaName: string = sanitizeIdentifier(originalSchemaName);

      /* Check for recursive references if context is available */
      if (options.recursiveContext) {
        const analysis = analyzeRecursiveReference(
          ref,
          options.recursiveContext,
          options.currentSchemaName,
        );

        if (analysis.isRecursive) {
          /* For direct self-references with lazy wrapping enabled, emit z.lazy() */
          if (
            analysis.isDirectSelfReference &&
            options.recursiveContext.useLazyWrapping
          ) {
            result.code = `z.lazy(() => ${schemaName})`;
            return result;
          }
          /* For recursive references, we don't add imports here as they'll be handled
             by the recursive schema generation */
          result.code = schemaName;
          return result;
        }
      }

      result.imports.add(schemaName);
      result.code = schemaName;
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
  return handleReference(schema, result, options);
}
