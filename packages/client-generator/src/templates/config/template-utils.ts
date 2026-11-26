import {
  formatImportSpecifier,
  type ImportExtension,
} from "@apical-ts/core-utils/shared";

/* Shared template utilities */

/*
 * Renders Standard Schema imports for generated client runtime helpers
 */
export function renderStandardSchemaImportStatements(
  importExtension: ImportExtension = "ts",
): string {
  const standardSchemaSpecifier = formatImportSpecifier(
    "../standard-schema",
    importExtension,
  );
  return `import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type StandardSchemaValidationError, validateStandardSchema } from "${standardSchemaSpecifier}";
`;
}
