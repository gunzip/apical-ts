/*
 * Parser for Zod schema files
 *
 * This module reads and parses Zod schema files to extract schema definitions
 */

import { readFile } from "node:fs/promises";

/**
 * Import information
 */
export interface ImportInfo {
  names: string[];
  source: string;
}

/**
 * Parsed schema information
 */
export interface ParsedModule {
  filePath: string;
  imports: ImportInfo[];
  schemas: ParsedSchemaItem[];
}

export interface ParsedSchemaItem {
  comments: string;
  definition: string;
  name: string;
}

/**
 * Schema definition information
 */
interface SchemaDefinition {
  comments: string;
  definition: string;
  name: string;
}

/**
 * Parses Zod schema content from a string
 */
export function parseZodSchemaContent(
  content: string,
  filePath: string,
): ParsedModule {
  /* Extract imports */
  const imports = extractImports(content);

  /* Extract schema name and definition */
  const schemas = extractModuleSchemas(content);

  if (schemas.length === 0) {
    throw new Error(`No schema definition found in ${filePath}`);
  }

  return { filePath, imports, schemas };
}

/**
 * Parses a Zod schema file and extracts schema information
 */
export async function parseZodSchemaFile(
  filePath: string,
): Promise<ParsedModule> {
  try {
    const content = await readFile(filePath, "utf-8");
    return parseZodSchemaContent(content, filePath);
  } catch (error) {
    throw new Error(
      `Failed to parse file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Extracts import statements from the content
 */
function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const importMatch = line.match(
      /^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?/,
    );
    if (importMatch) {
      const names = importMatch[1]
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const source = importMatch[2];

      imports.push({
        names,
        source,
      });
    }
  }

  return imports;
}

/**
 * Extracts the main schema definition from content
 */
function extractModuleSchemas(content: string): SchemaDefinition[] {
  const lines = content.split("\n");

  const exportConstPattern = /^export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(.*)$/;
  const constPattern = /^const\s+([A-Za-z0-9_]+)\s*=\s*(.*)$/;
  const exportNamesPattern = /^export\s*\{([^}]+)\}\s*;?/;

  const constDefs = new Map<string, { comments: string; def: string }>();
  const exportedNames = new Set<string>();
  const results: SchemaDefinition[] = [];

  let pendingComment: null | string = null;
  let inJsDoc = false;

  const readDefinitionFrom = (
    startIndex: number,
    initialRhs: string,
  ): { end: number; rhs: string } => {
    let rhs = initialRhs.trim();
    if (rhs.endsWith(";"))
      return { end: startIndex, rhs: rhs.replace(/;$/, "").trim() };
    let j = startIndex + 1;
    while (j < lines.length) {
      const l = lines[j];
      rhs += l;
      if (l.includes(";")) {
        break;
      }
      j++;
    }
    return { end: j, rhs: rhs.replace(/;.*$/, "").trim() };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track a JSDoc block to attach to the next definition
    if (trimmed.startsWith("/**")) {
      inJsDoc = true;
      pendingComment = "";
    }
    if (inJsDoc) {
      pendingComment = (pendingComment ?? "") + line + "\n";
      if (trimmed.endsWith("*/")) inJsDoc = false;
      continue;
    }

    const mExportConst = trimmed.match(exportConstPattern);
    if (mExportConst) {
      const name = mExportConst[1];
      const { end, rhs } = readDefinitionFrom(i, mExportConst[2]);
      results.push({ comments: pendingComment ?? "", definition: rhs, name });
      pendingComment = null;
      i = end;
      exportedNames.add(name);
      continue;
    }

    const mConst = trimmed.match(constPattern);
    if (mConst) {
      const name = mConst[1];
      const { end, rhs } = readDefinitionFrom(i, mConst[2]);
      constDefs.set(name, { comments: pendingComment ?? "", def: rhs });
      pendingComment = null;
      i = end;
      continue;
    }

    const mExportNames = trimmed.match(exportNamesPattern);
    if (mExportNames) {
      const names = mExportNames[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.split(/\s+as\s+/)[0]?.trim());
      for (const n of names) {
        if (!n) continue;
        exportedNames.add(n);
      }
      continue;
    }
  }

  // Add exported names that came from plain const definitions
  for (const name of exportedNames) {
    if (results.find((r) => r.name === name)) continue;
    const rec = constDefs.get(name);
    if (rec) {
      results.push({ comments: rec.comments, definition: rec.def, name });
    }
  }

  return results;
}
