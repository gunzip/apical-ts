import { promises as fs } from "fs";
import path from "path";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";

import { generateParameterSchemas } from "../shared/parameter-schemas.js";
import { sanitizeIdentifier } from "./utils.js";

/**
 * Result of parameter schema file generation
 */
export interface ParameterSchemaFileResult {
  content: string;
  fileName: string;
  typeImports: Set<string>;
}

/**
 * Generates Zod schema files for operation parameters.
 * Creates separate files for each operation's query, path, and headers schemas.
 */
export async function generateParameterSchemaFile(
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: {
    /* Use client defaults for parameter schema generation */
    coercePrimitives?: boolean;
    lowercaseHeaderKeys?: boolean;
  } = {},
): Promise<ParameterSchemaFileResult> {
  const sanitizedId = sanitizeIdentifier(operationId);
  const fileName = `${sanitizedId}Parameters.ts`;

  /* Generate parameter schemas using shared logic */
  const result = generateParameterSchemas(
    operationId,
    parameterMetadata.parameterGroups,
    options,
  );

  /* Build the file content */
  const imports: string[] = [];

  /* Always include Zod import */
  imports.push(`import * as z from "zod";`);

  /* Add other type imports */
  if (result.typeImports.size > 0) {
    const typeImportsList = Array.from(result.typeImports).sort();
    for (const typeImport of typeImportsList) {
      if (typeImport !== "z") {
        imports.push(`import { ${typeImport} } from "./${typeImport}.js";`);
      }
    }
  }

  const content = [
    ...imports,
    "",
    "/* Parameter schemas for type-safe inputs */",
    result.schemaCode,
    "",
    "/* Export schemas for external use */",
    `export { ${result.schemaNames.querySchema} };`,
    `export { ${result.schemaNames.pathSchema} };`,
    `export { ${result.schemaNames.headersSchema} };`,
    "",
    "/* Export types for external use */",
    `export type ${result.schemaNames.querySchema} = z.infer<typeof ${result.schemaNames.querySchema}>;`,
    `export type ${result.schemaNames.pathSchema} = z.infer<typeof ${result.schemaNames.pathSchema}>;`,
    `export type ${result.schemaNames.headersSchema} = z.infer<typeof ${result.schemaNames.headersSchema}>;`,
    "",
  ].join("\n");

  return {
    content,
    fileName,
    typeImports: result.typeImports,
  };
}

/**
 * Writes parameter schema file to the schemas directory
 */
export async function writeParameterSchemaFile(
  schemasDir: string,
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: {
    coercePrimitives?: boolean;
    lowercaseHeaderKeys?: boolean;
  } = {},
): Promise<void> {
  const result = await generateParameterSchemaFile(
    operationId,
    parameterMetadata,
    options,
  );

  const filePath = path.join(schemasDir, result.fileName);
  await fs.writeFile(filePath, result.content, "utf-8");
}
