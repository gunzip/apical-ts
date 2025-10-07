/*
 * File writer for ArkType schemas
 *
 * This module writes converted ArkType schemas to files
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Information needed to write a schema file
 */
export interface SchemaFileInfo {
  arktypeCode: string;
  comments: string;
  imports: Set<string>;
  importSources: Map<string, string>;
  schemaName: string;
}

/**
 * Writes an ArkType schema to a file
 */
export async function writeArktypeSchema(
  outputPath: string,
  schemaInfo: SchemaFileInfo,
): Promise<void> {
  try {
    /* Ensure output directory exists */
    await mkdir(dirname(outputPath), { recursive: true });

    /* Generate file content */
    const content = generateSchemaFile(schemaInfo);

    /* Write file */
    await writeFile(outputPath, content, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write schema file ${outputPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Writes an index file that exports all schemas
 */
export async function writeIndexFile(
  outputDir: string,
  schemaNames: string[],
): Promise<void> {
  try {
    const indexPath = join(outputDir, "index.ts");

    /* Generate exports */
    const exports = schemaNames
      .sort()
      .map((name) => `export { ${name} } from "./${name}.js";`)
      .join("\n");

    await writeFile(indexPath, exports + "\n", "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write index file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Writes a minimal package.json with a build script for typechecking the generated schemas.
 */
export async function writePackageJson(outputDir: string): Promise<void> {
  const pkgPath = join(outputDir, "package.json");
  const pkg = {
    dependencies: {
      arktype: "^2.1.22",
    },
    devDependencies: {
      typescript: "^5.4.5",
    },
    name: "arktype-schemas",
    private: true,
    scripts: {
      build: "tsc --noEmit",
    },
    type: "module",
    version: "0.0.0",
  } satisfies Record<string, unknown>;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}

/**
 * Writes a minimal tsconfig.json enabling NodeNext resolution to support .js extension imports.
 */
export async function writeTsConfig(outputDir: string): Promise<void> {
  const tsconfigPath = join(outputDir, "tsconfig.json");
  const tsconfig = {
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2022",
    },
    include: ["*.ts"],
  } satisfies Record<string, unknown>;
  await writeFile(
    tsconfigPath,
    JSON.stringify(tsconfig, null, 2) + "\n",
    "utf-8",
  );
}

/**
 * Generates the content of an ArkType schema file
 */
function generateSchemaFile(schemaInfo: SchemaFileInfo): string {
  const parts: string[] = [];

  /* Add imports */
  parts.push('import { type } from "arktype";');

  /* Add schema imports */
  if (schemaInfo.imports.size > 0) {
    // Avoid self-imports by filtering out the current schema name
    const filtered = new Set(
      Array.from(schemaInfo.imports).filter((n) => n !== schemaInfo.schemaName),
    );
    const importsBySource = groupImportsBySource(
      filtered,
      schemaInfo.importSources,
    );
    for (const [source, names] of importsBySource) {
      const importNames = Array.from(names).sort().join(", ");
      parts.push(`import { ${importNames} } from "${source}";`);
    }
  }

  parts.push("");

  /* Add comments if present */
  if (schemaInfo.comments) {
    // Normalize JSDoc opening to a regular block to avoid toolchains that strip JSDoc
    const normalized = schemaInfo.comments.replace(/^\/\*\*/m, "/*").trim();
    parts.push(normalized);
  }

  /* Add schema definition */
  parts.push(
    `export const ${schemaInfo.schemaName} = ${schemaInfo.arktypeCode};`,
  );

  /* Add type inference */
  parts.push(
    `export type ${schemaInfo.schemaName} = typeof ${schemaInfo.schemaName}.infer;`,
  );

  return parts.join("\n") + "\n";
}

/**
 * Groups imports by their source
 */
function groupImportsBySource(
  imports: Set<string>,
  sources: Map<string, string>,
): Map<string, Set<string>> {
  const grouped = new Map<string, Set<string>>();

  for (const importName of imports) {
    const source = sources.get(importName) ?? "./unknown.js";
    if (!grouped.has(source)) {
      grouped.set(source, new Set());
    }
    const group = grouped.get(source);
    if (group) {
      group.add(importName);
    }
  }

  return grouped;
}
