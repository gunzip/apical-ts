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

/*
 * Builds the lookup map used during schema conversion.
 * A registry keeps format resolution O(1) once CLI input has already been
 * validated and normalized upstream.
 */
export function createStringFormatOverrideRegistry(
  overrides: readonly StringFormatOverride[] = [],
): StringFormatOverrideRegistry {
  const registry = new Map<string, StringFormatOverride>();

  for (const override of overrides) {
    registry.set(override.format, override);
  }

  return registry;
}

/*
 * Resolves the override for a raw OpenAPI `format` token.
 * This is the main lookup used by primitive string conversion.
 */
export function findStringFormatOverride(
  format: string | undefined,
  registry?: StringFormatOverrideRegistry,
): StringFormatOverride | undefined {
  if (!format || !registry) {
    return undefined;
  }

  return registry.get(format);
}

/*
 * Resolves an override starting from the generated alias name rather than the
 * original OpenAPI format token.
 * File writers use this in the opposite direction when they need to turn a
 * dependency like `__apicalStringFormatTaxCode` back into a real import.
 */
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

/*
 * Renders import statements for the reserved aliases used by format overrides.
 * The caller passes the full dependency set for a generated file; this helper
 * filters out only override aliases, groups them by source, and emits stable
 * sorted imports.
 */
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
    // Multiple schema fragments can require the same alias; emit it once.
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
    // Keep the generated alias stable even if the user export name is generic.
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

/*
 * Generates the reserved local alias used inside generated code for a format
 * override. The alias is deterministic and sanitized so it never depends on
 * user-export naming conventions.
 */
export function getStringFormatOverrideReferenceName(format: string): string {
  const identifier = sanitizeIdentifier(format);
  return `__apicalStringFormat${identifier.charAt(0).toUpperCase()}${identifier.slice(1)}`;
}

/*
 * Converts an override source into the import specifier that should appear in
 * generated files. Module specifiers are preserved, while filesystem paths are
 * rewritten relative to the generated file location.
 */
function getImportSpecifier(
  source: StringFormatOverrideImport,
  filePath: string,
): string {
  if (source.kind === "module") {
    return source.specifier;
  }

  const relativePath = path.relative(path.dirname(filePath), source.path);
  const normalizedPath = relativePath.replaceAll(path.sep, "/");
  // Ensure path-based imports stay valid ESM relative specifiers.
  const importPath = normalizedPath.startsWith(".")
    ? normalizedPath
    : `./${normalizedPath}`;

  return rewriteTypeScriptExtension(importPath);
}

/*
 * Rewrites TypeScript source extensions to the runtime module extension that
 * generated ESM code must import. This keeps path-based overrides compatible
 * with the emitted `.js`/`.mjs`/`.cjs` files.
 */
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
