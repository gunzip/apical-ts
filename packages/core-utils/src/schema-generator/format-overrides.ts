import path from "node:path";

import { sanitizeIdentifier } from "./utils.js";

export type StringFormatOverrideImport =
  | { kind: "module"; specifier: string }
  | { kind: "path"; path: string };

export interface StringFormatOverride {
  format: string;
  import: StringFormatOverrideImport;
  importName: string;
}

export type StringFormatOverrideRegistry = ReadonlyMap<
  string,
  StringFormatOverride
>;

export function createStringFormatOverrideRegistry(
  overrides: readonly StringFormatOverride[] = [],
): StringFormatOverrideRegistry {
  const registry = new Map<string, StringFormatOverride>();

  for (const override of overrides) {
    registry.set(override.format, override);
  }

  return registry;
}

export function findStringFormatOverride(
  format: string | undefined,
  registry?: StringFormatOverrideRegistry,
): StringFormatOverride | undefined {
  if (!format || !registry) {
    return undefined;
  }

  return registry.get(format);
}

export function findStringFormatOverrideByReferenceName(
  referenceName: string,
  registry?: StringFormatOverrideRegistry,
): StringFormatOverride | undefined {
  if (!registry) {
    return undefined;
  }

  for (const override of registry.values()) {
    if (
      getStringFormatOverrideReferenceName(override.format) === referenceName
    ) {
      return override;
    }
  }

  return undefined;
}

export function renderStringFormatOverrideImports(
  imports: Iterable<string>,
  registry: StringFormatOverrideRegistry | undefined,
  filePath: string,
): string[] {
  if (!registry) {
    return [];
  }

  const groupedImports = new Map<string, Set<string>>();
  const seenReferenceNames = new Set<string>();

  for (const importName of imports) {
    if (seenReferenceNames.has(importName)) {
      continue;
    }
    seenReferenceNames.add(importName);

    const override = findStringFormatOverrideByReferenceName(
      importName,
      registry,
    );
    if (!override) {
      continue;
    }

    const importSpecifier = getImportSpecifier(override.import, filePath);
    const renderedBinding = `${override.importName} as ${importName}`;
    const bindings = groupedImports.get(importSpecifier) ?? new Set<string>();
    bindings.add(renderedBinding);
    groupedImports.set(importSpecifier, bindings);
  }

  return Array.from(groupedImports.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([importSpecifier, bindings]) => {
      const sortedBindings = Array.from(bindings).sort();
      return `import { ${sortedBindings.join(", ")} } from ${JSON.stringify(importSpecifier)};`;
    });
}

export function getStringFormatOverrideReferenceName(format: string): string {
  const identifier = sanitizeIdentifier(format);
  return `__apicalStringFormat${identifier.charAt(0).toUpperCase()}${identifier.slice(1)}`;
}

function getImportSpecifier(
  source: StringFormatOverrideImport,
  filePath: string,
): string {
  if (source.kind === "module") {
    return source.specifier;
  }

  const relativePath = path.relative(path.dirname(filePath), source.path);
  const normalizedPath = relativePath.replaceAll(path.sep, "/");
  const importPath = normalizedPath.startsWith(".")
    ? normalizedPath
    : `./${normalizedPath}`;

  return rewriteTypeScriptExtension(importPath);
}

function rewriteTypeScriptExtension(importPath: string): string {
  if (importPath.endsWith(".d.ts")) {
    return `${importPath.slice(0, -5)}.js`;
  }
  if (importPath.endsWith(".mts")) {
    return `${importPath.slice(0, -4)}.mjs`;
  }
  if (importPath.endsWith(".cts")) {
    return `${importPath.slice(0, -4)}.cjs`;
  }
  if (importPath.endsWith(".ts") || importPath.endsWith(".tsx")) {
    return `${importPath.slice(0, importPath.lastIndexOf("."))}.js`;
  }
  return importPath;
}
