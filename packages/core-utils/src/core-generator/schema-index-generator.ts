import { promises as fs } from "fs";
import path from "path";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

export interface SchemaIndexEntry {
  exportNames: string[];
  fileName: string;
}

export function buildSchemaFileIndexEntry(fileName: string): SchemaIndexEntry {
  return {
    exportNames: [path.basename(fileName, ".ts")],
    fileName,
  };
}

export function buildParameterSchemaIndexEntry(
  parameterMetadata: OperationParameterMetadata,
): SchemaIndexEntry {
  const sanitizedId = sanitizeIdentifier(parameterMetadata.operationId);
  const exportNames: string[] = [];

  if (parameterMetadata.parameterGroups.queryParams.length > 0) {
    exportNames.push(`${sanitizedId}QuerySchema`);
  }
  if (parameterMetadata.parameterGroups.pathParams.length > 0) {
    exportNames.push(`${sanitizedId}PathSchema`);
  }

  const hasHeaders =
    parameterMetadata.parameterGroups.headerParams.length > 0 ||
    (parameterMetadata.securityHeaders?.length ?? 0) > 0;
  if (hasHeaders) {
    exportNames.push(`${sanitizedId}HeadersSchema`);
  }

  return {
    exportNames,
    fileName: `${sanitizedId}Parameters.ts`,
  };
}

export function buildSchemaIndexContent(
  entries: readonly SchemaIndexEntry[],
): string {
  const imports: string[] = [];
  const exports = new Set<string>();

  const normalizedEntries = normalizeSchemaIndexEntries(entries);

  for (const entry of normalizedEntries) {
    imports.push(...buildImportLines(entry));

    for (const exportName of entry.exportNames) {
      exports.add(exportName);
    }
  }

  const sortedExports = [...exports].sort();

  return [
    ...imports,
    "",
    "export {",
    ...sortedExports.map((exportName) => `  ${exportName},`),
    "};",
    "",
  ].join("\n");
}

export async function generateSchemaIndex(
  schemasDir: string,
  entries: readonly SchemaIndexEntry[],
): Promise<void> {
  const content = buildSchemaIndexContent(entries);
  const indexPath = path.join(schemasDir, "index.ts");
  await fs.writeFile(indexPath, content, "utf-8");
}

function normalizeSchemaIndexEntries(
  entries: readonly SchemaIndexEntry[],
): SchemaIndexEntry[] {
  const exportsByFileName = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (entry.exportNames.length === 0) {
      continue;
    }

    const exportNames = exportsByFileName.get(entry.fileName) ?? new Set();

    for (const exportName of entry.exportNames) {
      exportNames.add(exportName);
    }

    exportsByFileName.set(entry.fileName, exportNames);
  }

  return [...exportsByFileName.entries()]
    .map(([fileName, exportNames]) => ({
      exportNames: [...exportNames],
      fileName,
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function buildImportLines(entry: SchemaIndexEntry): string[] {
  const fileBaseName = path.basename(entry.fileName, ".ts");

  if (
    entry.exportNames.length === 1 &&
    !entry.fileName.includes("Parameters.ts")
  ) {
    return [`import { ${entry.exportNames[0]} } from "./${fileBaseName}.js";`];
  }

  return [
    "import {",
    ...entry.exportNames.map((exportName) => `  ${exportName},`),
    `} from "./${fileBaseName}.js";`,
  ];
}
