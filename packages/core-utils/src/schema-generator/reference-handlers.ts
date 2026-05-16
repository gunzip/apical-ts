import type { ReferenceObject } from "openapi3-ts/oas31";

import type { RecursiveContext } from "./recursive-handlers.js";
import type { GeneratedSchemaHelper } from "./types.js";

import { analyzeRecursiveReference } from "./recursive-handlers.js";
import { parseSchemaReference } from "./schema-references.js";

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
  helpers: Set<GeneratedSchemaHelper>;
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
    const schemaReference = parseSchemaReference(ref);
    if (schemaReference) {
      const { identifierName: schemaName } = schemaReference;

      if (options.currentSchemaName === schemaName) {
        result.code = `z.lazy(() => ${schemaName})`;
        return result;
      }

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
