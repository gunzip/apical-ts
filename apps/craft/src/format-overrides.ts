import type { StringFormatOverride } from "@apical-ts/core-utils";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import path from "node:path";

/* Named imports in generated files must be valid TypeScript identifiers. */
const VALID_IDENTIFIER = /^[$A-Z_a-z][$\w]*$/;

/*
 * Parses the repeatable `--format` CLI values into normalized overrides.
 * This batches per-entry parsing and enforces uniqueness early so generation
 * can treat the mapping as a simple one-to-one lookup by OpenAPI format.
 */
export function parseFormatOverrideArguments(
  mappings: readonly string[] = [],
  cwd = process.cwd(),
): StringFormatOverride[] {
  const overrides = mappings.map((mapping) =>
    parseFormatOverrideArgument(mapping, cwd),
  );
  const seenFormats = new Set<string>();

  for (const override of overrides) {
    if (seenFormats.has(override.format)) {
      throw new Error(
        `Duplicate --format override for "${override.format}". Each format can only be mapped once.`,
      );
    }
    seenFormats.add(override.format);
  }

  return overrides;
}

/*
 * Parses a single `--format` value of the form
 * `<format>=<module-or-path>[#<export>]`.
 * It validates the user-facing contract up front so downstream generators only
 * receive a normalized `{ format, import, importName }` shape.
 */
export function parseFormatOverrideArgument(
  mapping: string,
  cwd = process.cwd(),
): StringFormatOverride {
  // Split only on the first `=` so the right-hand side stays intact.
  const separatorIndex = mapping.indexOf("=");
  if (separatorIndex <= 0 || separatorIndex === mapping.length - 1) {
    throw new Error(
      `Invalid --format value "${mapping}". Expected <format>=<module-or-path>[#<export>].`,
    );
  }

  const format = mapping.slice(0, separatorIndex).trim();
  const importTarget = mapping.slice(separatorIndex + 1).trim();
  if (!format) {
    throw new Error(
      `Invalid --format value "${mapping}". The OpenAPI format name cannot be empty.`,
    );
  }
  if (!importTarget) {
    throw new Error(
      `Invalid --format value "${mapping}". The import target cannot be empty.`,
    );
  }

  const { importName = inferImportName(importTarget), source } =
    parseImportTarget(importTarget, cwd);

  return {
    format,
    import: source,
    importName,
  };
}

/*
 * Infers the named export to import when the user omits `#ExportName`.
 * We derive it from the last path/module segment, sanitize it into a valid
 * identifier, and promote it to PascalCase to match common schema naming.
 */
function inferImportName(importTarget: string): string {
  const sourceWithoutExport = stripExplicitExport(importTarget);
  const baseName = path.basename(sourceWithoutExport);
  const extension = path.extname(baseName);
  const inferredBaseName = extension
    ? baseName.slice(0, -extension.length)
    : baseName;

  if (!inferredBaseName) {
    throw new Error(
      `Unable to infer an export name from "${importTarget}". Use --format <format>=<module-or-path> or include #<export> when it cannot be inferred.`,
    );
  }

  try {
    const identifier = sanitizeIdentifier(inferredBaseName);
    return identifier.charAt(0).toUpperCase() + identifier.slice(1);
  } catch {
    throw new Error(
      `Unable to infer an export name from "${importTarget}". Use --format <format>=<module-or-path> or include #<export> when it cannot be inferred.`,
    );
  }
}

/*
 * Distinguishes filesystem paths from module specifiers.
 * We intentionally require explicit relative or absolute path syntax so bare
 * values such as `src/foo/TaxCode.ts` still behave like module specifiers.
 */
function isFilePathSource(source: string): boolean {
  return (
    source.startsWith("./") ||
    source.startsWith("../") ||
    path.isAbsolute(source)
  );
}

/*
 * Splits the import target into source + optional export name and normalizes
 * the source into either a module specifier or an absolute filesystem path.
 * This keeps all import-shape decisions in one place before generation starts.
 */
function parseImportTarget(
  importTarget: string,
  cwd: string,
): {
  importName?: string;
  source:
    | { kind: "module"; specifier: string }
    | { kind: "path"; path: string };
} {
  // Use the last `#` so only the trailing segment is treated as the export name.
  const exportSeparatorIndex = importTarget.lastIndexOf("#");
  const hasExportSeparator = exportSeparatorIndex > -1;
  const explicitImportName = hasExportSeparator
    ? importTarget.slice(exportSeparatorIndex + 1).trim()
    : undefined;

  if (hasExportSeparator && !explicitImportName) {
    throw new Error(
      `Invalid --format value "${importTarget}". The import target contains "#" but no export name follows it.`,
    );
  }

  const rawSource = (
    hasExportSeparator
      ? importTarget.slice(0, exportSeparatorIndex)
      : importTarget
  ).trim();

  if (!rawSource) {
    throw new Error(
      `Invalid --format value "${importTarget}". The import target cannot be empty.`,
    );
  }

  if (explicitImportName && !VALID_IDENTIFIER.test(explicitImportName)) {
    throw new Error(
      `Invalid export name "${explicitImportName}" in --format value "${importTarget}".`,
    );
  }

  return {
    importName: explicitImportName,
    // Resolve project paths eagerly so later stages never depend on the caller cwd.
    source: isFilePathSource(rawSource)
      ? { kind: "path", path: path.resolve(cwd, rawSource) }
      : { kind: "module", specifier: rawSource },
  };
}

/*
 * Removes an explicit `#ExportName` suffix before name inference.
 * Inference should only look at the source portion of the mapping.
 */
function stripExplicitExport(importTarget: string): string {
  const exportSeparatorIndex = importTarget.lastIndexOf("#");
  if (
    exportSeparatorIndex <= -1 ||
    exportSeparatorIndex === importTarget.length - 1
  ) {
    return importTarget;
  }
  return importTarget.slice(0, exportSeparatorIndex);
}
