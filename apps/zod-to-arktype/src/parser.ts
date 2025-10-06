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
export interface ParsedSchema {
  comments: string;
  filePath: string;
  imports: ImportInfo[];
  schemaDefinition: string;
  schemaName: string;
  typeDefinition: string;
}

/**
 * Schema definition information
 */
interface SchemaDefinition {
  comments: string;
  definition: string;
  name: string;
  typeDefinition: string;
}

/**
 * Parses Zod schema content from a string
 */
export function parseZodSchemaContent(
  content: string,
  filePath: string,
): ParsedSchema {
  /* Extract imports */
  const imports = extractImports(content);

  /* Extract schema name and definition */
  const schema = extractSchemaDefinition(content);

  if (!schema) {
    throw new Error(`No schema definition found in ${filePath}`);
  }

  return {
    comments: schema.comments,
    filePath,
    imports,
    schemaDefinition: schema.definition,
    schemaName: schema.name,
    typeDefinition: schema.typeDefinition,
  };
}

/**
 * Parses a Zod schema file and extracts schema information
 */
export async function parseZodSchemaFile(
  filePath: string,
): Promise<ParsedSchema> {
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
function extractSchemaDefinition(content: string): null | SchemaDefinition {
  /* Look for patterns like: export const SchemaName = z.object(...) */
  const exportPattern = /export\s+const\s+([A-Za-z0-9_]+)\s+=\s+(.+);/;
  const typePattern =
    /export\s+type\s+([A-Za-z0-9_]+)\s+=\s+z\.infer<typeof\s+([A-Za-z0-9_]+)>;/;

  const lines = content.split("\n");
  let schemaName = "";
  let schemaDefinition = "";
  let typeDefinition = "";
  let comments = "";
  let currentComment = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    /* Check for JSDoc comments */
    if (line.trim().startsWith("/**")) {
      currentComment = "";
    }
    if (
      line.includes("/**") ||
      line.includes("*/") ||
      line.trim().startsWith("*")
    ) {
      currentComment += line + "\n";
    }

    /* Check for schema export */
    const exportMatch = line.match(exportPattern);
    if (exportMatch) {
      schemaName = exportMatch[1];
      schemaDefinition = exportMatch[2];

      /* If definition spans multiple lines, continue reading */
      if (!schemaDefinition.includes(";") && i < lines.length - 1) {
        let j = i + 1;
        while (j < lines.length && !lines[j].includes("export type")) {
          schemaDefinition += lines[j];
          if (lines[j].includes(";")) {
            break;
          }
          j++;
        }
        schemaDefinition = schemaDefinition.replace(/;$/, "").trim();
      } else {
        schemaDefinition = schemaDefinition.replace(/;$/, "").trim();
      }

      if (currentComment) {
        comments = currentComment;
      }
    }

    /* Check for type definition */
    const typeMatch = line.match(typePattern);
    if (typeMatch && typeMatch[2] === schemaName) {
      typeDefinition = line.trim();
    }
  }

  if (!schemaName || !schemaDefinition) {
    return null;
  }

  return {
    comments,
    definition: schemaDefinition,
    name: schemaName,
    typeDefinition,
  };
}
