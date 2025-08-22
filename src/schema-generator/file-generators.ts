import type { SchemaObject } from "openapi3-ts/oas31";

import { format } from "prettier";

import { zodSchemaToCode } from "./schema-converter.js";

/**
 * Schema file generation result
 */
export type SchemaFileResult = {
  content: string;
  fileName: string;
};

/**
 * Options for schema file generation
 */
export type SchemaGenerationOptions = {
  strictValidation?: boolean;
};

/**
 * Generates file content for a request schema
 */
export async function generateRequestSchemaFile(
  name: string,
  schema: SchemaObject,
  options: SchemaGenerationOptions = {},
): Promise<SchemaFileResult> {
  const schemaVar = `${name.charAt(0).toUpperCase() + name.slice(1)}`;
  const description = `Request schema for ${name.replace("Request", "")} operation`;

  return generateSchemaFile(schemaVar, schema, description, options);
}

/**
 * Generates file content for a response schema
 */
export async function generateResponseSchemaFile(
  name: string,
  schema: SchemaObject,
  options: SchemaGenerationOptions = {},
): Promise<SchemaFileResult> {
  const description = `Response schema for ${name.replace(/Response$/, "").replace(/\d+Response/, " operation")}`;

  return generateSchemaFile(name, schema, description, options);
}

/**
 * Generates file content for a schema with extensible enum support
 */
export async function generateSchemaFile(
  name: string,
  schema: SchemaObject,
  description?: string,
  options: SchemaGenerationOptions = {},
): Promise<SchemaFileResult> {
  const { strictValidation = false } = options;
  const schemaResult = zodSchemaToCode(schema, {
    isTopLevel: true,
    strictValidation,
  });

  // Generate comment if description exists
  const commentSection = description
    ? `/**\n * ${description
        .replace(/\*\//g, "*\\/") // Escape */ to prevent breaking comment blocks
        .split("\n")
        .map((line) => line.trim())
        .join("\n * ")}\n */\n`
    : "";

  // Generate imports for dependencies
  const imports = Array.from(schemaResult.imports)
    .filter((importName) => importName !== name) // Don't import self
    .map((importName) => `import { ${importName} } from "./${importName}.js";`)
    .join("\n");

  const importsSection = imports ? `${imports}\n` : "";

  let content: string;

  // Handle extensible enum case
  if (schemaResult.extensibleEnumValues) {
    const enumValues = schemaResult.extensibleEnumValues
      .map((e: unknown) => JSON.stringify(e))
      .join(" | ");
    const typeContent = `export type ${name} = ${enumValues} | (string & {});`;
    const schemaContent = `${commentSection}export const ${name} = ${schemaResult.code};`;

    content = `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  } else {
    const schemaContent = `${commentSection}export const ${name} = ${schemaResult.code};`;
    const typeContent = `export type ${name} = z.infer<typeof ${name}>;`;

    content = `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  }

  const formattedContent = await format(content, {
    parser: "typescript",
  });

  return {
    content: formattedContent,
    fileName: `${name}.ts`,
  };
}
