export interface ImportInfo {
  names: string[];
  moduleSpecifier: string;
}

export function rewriteImports(
  originalImports: ImportInfo[],
  referencedSchemas: Set<string>,
  needsTypeImport: boolean,
): string[] {
  const lines: string[] = [];
  const schemaImportsByModule = new Map<string, string[]>();

  if (needsTypeImport) {
    lines.push(`import { type } from "arktype";`);
  }

  for (const imp of originalImports) {
    /* Skip zod imports entirely */
    if (
      imp.moduleSpecifier === "zod" ||
      imp.moduleSpecifier === "z" ||
      imp.moduleSpecifier.endsWith("/zod")
    ) {
      continue;
    }

    /* Skip standard-schema imports */
    if (imp.moduleSpecifier.includes("@standard-schema")) {
      continue;
    }

    /* Keep schema cross-references that are actually used */
    const usedNames = imp.names.filter((n) => referencedSchemas.has(n));
    if (usedNames.length > 0) {
      const existing = schemaImportsByModule.get(imp.moduleSpecifier) || [];
      schemaImportsByModule.set(imp.moduleSpecifier, [
        ...existing,
        ...usedNames,
      ]);
    }
  }

  for (const [moduleSpecifier, names] of schemaImportsByModule) {
    const uniqueNames = [...new Set(names)].sort();
    lines.push(
      `import { ${uniqueNames.join(", ")} } from "${moduleSpecifier}";`,
    );
  }

  return lines;
}
