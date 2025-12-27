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

  /* Generate server-specific schemas with coercion and lowercase headers */
  const serverResult = generateParameterSchemas(
    operationId,
    parameterMetadata.parameterGroups,
    {
      coercePrimitives: true,
      lowercaseHeaderKeys: true,
    },
  );

  const serverSchemaPrefix = "Server";
  const serverSchemaNames = {
    headersSchema: `${sanitizedId}${serverSchemaPrefix}HeadersSchema`,
    pathSchema: `${sanitizedId}${serverSchemaPrefix}PathSchema`,
    querySchema: `${sanitizedId}${serverSchemaPrefix}QuerySchema`,
  };

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

  /* Generate ParsedParams runtime object and type */
  const parsedParamsName = `${sanitizedId}ParsedParams`;
  const parsedParamsObject = `export const ${parsedParamsName} = {
  query: ${result.schemaNames.querySchema},
  path: ${result.schemaNames.pathSchema},
  headers: ${result.schemaNames.headersSchema},
} as const;`;

  const parsedParamsType = `export type ${parsedParamsName}Type = {
  query: z.infer<typeof ${result.schemaNames.querySchema}>;
  path: z.infer<typeof ${result.schemaNames.pathSchema}>;
  headers: z.infer<typeof ${result.schemaNames.headersSchema}>;
};`;

  /* Generate server-specific ParsedParams */
  const serverParsedParamsObject = `export const ${sanitizedId}${serverSchemaPrefix}ParsedParams = {
  query: ${serverSchemaNames.querySchema},
  path: ${serverSchemaNames.pathSchema},
  headers: ${serverSchemaNames.headersSchema},
} as const;`;

  /* Rename server schema definitions to use Server prefix */
  const serverSchemaCode = serverResult.schemaCode
    .replace(
      new RegExp(`const ${result.schemaNames.querySchema} =`, "g"),
      `const ${serverSchemaNames.querySchema} =`,
    )
    .replace(
      new RegExp(`const ${result.schemaNames.pathSchema} =`, "g"),
      `const ${serverSchemaNames.pathSchema} =`,
    )
    .replace(
      new RegExp(`const ${result.schemaNames.headersSchema} =`, "g"),
      `const ${serverSchemaNames.headersSchema} =`,
    );

  const content = [
    ...imports,
    "",
    "/* Parameter schemas for type-safe inputs */",
    result.schemaCode,
    "",
    "/* Server parameter schemas with coercion and lowercase headers */",
    serverSchemaCode,
    "",
    "/* Export schemas for external use */",
    `export { ${result.schemaNames.querySchema} };`,
    `export { ${result.schemaNames.pathSchema} };`,
    `export { ${result.schemaNames.headersSchema} };`,
    "",
    "/* Export server schemas */",
    `export { ${serverSchemaNames.querySchema} };`,
    `export { ${serverSchemaNames.pathSchema} };`,
    `export { ${serverSchemaNames.headersSchema} };`,
    "",
    "/* Export types for external use */",
    `export type ${result.schemaNames.querySchema} = z.infer<typeof ${result.schemaNames.querySchema}>;`,
    `export type ${result.schemaNames.pathSchema} = z.infer<typeof ${result.schemaNames.pathSchema}>;`,
    `export type ${result.schemaNames.headersSchema} = z.infer<typeof ${result.schemaNames.headersSchema}>;`,
    "",
    "/* Combined parsed parameters object */",
    parsedParamsObject,
    "",
    "/* Combined parsed parameters type */",
    parsedParamsType,
    "",
    "/* Combined server parsed parameters object */",
    serverParsedParamsObject,
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
