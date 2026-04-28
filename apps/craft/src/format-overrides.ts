import type { StringFormatOverride } from "@apical-ts/core-utils";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import path from "node:path";

const VALID_IDENTIFIER = /^[$A-Z_a-z][$\w]*$/;

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

export function parseFormatOverrideArgument(
  mapping: string,
  cwd = process.cwd(),
): StringFormatOverride {
  const separatorIndex = mapping.indexOf("=");
  if (separatorIndex <= 0 || separatorIndex === mapping.length - 1) {
    throw new Error(
      `Invalid --format value "${mapping}". Expected <format>=<module-or-path>#<export>.`,
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

function inferImportName(importTarget: string): string {
  const sourceWithoutExport = stripExplicitExport(importTarget);
  const baseName = path.basename(sourceWithoutExport);
  const extension = path.extname(baseName);
  const inferredBaseName = extension
    ? baseName.slice(0, -extension.length)
    : baseName;

  if (!inferredBaseName) {
    throw new Error(
      `Unable to infer an export name from "${importTarget}". Use --format <format>=<module-or-path>#<export>.`,
    );
  }

  const identifier = sanitizeIdentifier(inferredBaseName);
  return identifier.charAt(0).toUpperCase() + identifier.slice(1);
}

function isFilePathSource(source: string): boolean {
  return (
    source.startsWith("./") ||
    source.startsWith("../") ||
    path.isAbsolute(source)
  );
}

function parseImportTarget(
  importTarget: string,
  cwd: string,
): {
  importName?: string;
  source:
    | { kind: "module"; specifier: string }
    | { kind: "path"; path: string };
} {
  const exportSeparatorIndex = importTarget.lastIndexOf("#");
  const hasExplicitExport =
    exportSeparatorIndex > -1 && exportSeparatorIndex < importTarget.length - 1;
  const rawSource = (
    hasExplicitExport
      ? importTarget.slice(0, exportSeparatorIndex)
      : importTarget
  ).trim();
  const explicitImportName = hasExplicitExport
    ? importTarget.slice(exportSeparatorIndex + 1).trim()
    : undefined;

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
    source: isFilePathSource(rawSource)
      ? { kind: "path", path: path.resolve(cwd, rawSource) }
      : { kind: "module", specifier: rawSource },
  };
}

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
