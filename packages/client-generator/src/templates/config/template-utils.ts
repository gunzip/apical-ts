/* Shared template utilities */

/*
 * Renders Standard Schema imports for generated client runtime helpers
 */
export function renderStandardSchemaImportStatements(): string {
  return `import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type StandardSchemaValidationError, validateStandardSchema } from "../standard-schema.ts";
`;
}
