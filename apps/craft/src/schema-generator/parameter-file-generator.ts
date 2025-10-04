import { promises as fs } from "fs";
import path from "path";
import { z, type ZodTypeAny } from "zod";

import type { TransformContext } from "../core-generator/index.js";
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
    zodTransform?: (schema: ZodTypeAny, ctx: TransformContext) => ZodTypeAny;
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

  /* Apply zodTransform if provided */
  let querySchemaCode = result.schemaCode.query;
  let pathSchemaCode = result.schemaCode.path;
  let headersSchemaCode = result.schemaCode.headers;

  if (options.zodTransform) {
    /* Apply transform to query schema */
    querySchemaCode = applyParameterTransform(
      querySchemaCode,
      options.zodTransform,
      {
        exportName: result.schemaNames.querySchema,
        in: "query",
        kind: "parameter",
        location: "inline",
        operationId,
        pointer: `#/paths/${parameterMetadata.path}/${parameterMetadata.method}/parameters`,
      },
    );

    /* Apply transform to path schema */
    pathSchemaCode = applyParameterTransform(
      pathSchemaCode,
      options.zodTransform,
      {
        exportName: result.schemaNames.pathSchema,
        in: "path",
        kind: "parameter",
        location: "inline",
        operationId,
        pointer: `#/paths/${parameterMetadata.path}/${parameterMetadata.method}/parameters`,
      },
    );

    /* Apply transform to headers schema */
    headersSchemaCode = applyParameterTransform(
      headersSchemaCode,
      options.zodTransform,
      {
        exportName: result.schemaNames.headersSchema,
        in: "header",
        kind: "parameter",
        location: "inline",
        operationId,
        pointer: `#/paths/${parameterMetadata.path}/${parameterMetadata.method}/parameters`,
      },
    );
  }

  /* Build the file content */
  const imports: string[] = [];

  /* Always include Zod import */
  imports.push(`import { z } from "zod";`);

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
    `const ${result.schemaNames.querySchema} = ${querySchemaCode};`,
    `const ${result.schemaNames.pathSchema} = ${pathSchemaCode};`,
    `const ${result.schemaNames.headersSchema} = ${headersSchemaCode};`,
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
    zodTransform?: (schema: ZodTypeAny, ctx: TransformContext) => ZodTypeAny;
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

/**
 * Applies a zodTransform to a parameter schema code string
 */
function applyParameterTransform(
  schemaCode: string,
  zodTransform: (schema: ZodTypeAny, ctx: TransformContext) => ZodTypeAny,
  transformContext: TransformContext,
): string {
  try {
    /* eslint-disable no-console */

    /* Evaluate the schema code to get a Zod schema instance */
    const evalFunc = new Function("z", `"use strict"; return ${schemaCode}`);
    const zodSchema = evalFunc(z);

    /* Apply the transform */
    const transformedSchema = zodTransform(zodSchema, transformContext);

    /* Serialize back to code */
    return serializeParameterSchema(transformedSchema, schemaCode);
  } catch (error) {
    /* If transform fails, log warning and return original code */
    console.warn(
      `⚠️ Failed to apply zodTransform to ${transformContext.exportName}:`,
      error instanceof Error ? error.message : error,
    );
    return schemaCode;
  }
}

/**
 * Serializes a Zod schema back to code string for parameter schemas
 */
function serializeParameterSchema(
  schema: ZodTypeAny,
  originalCode: string,
): string {
  let code = originalCode;

  /* Check for .default() transformation */
  if (
    schema._def?.type === "default" &&
    schema._def?.defaultValue !== undefined
  ) {
    const defaultValue = schema._def.defaultValue;
    code = `${code}.default(${JSON.stringify(defaultValue)})`;
  }

  /* Check for .brand() transformation */
  if (schema._def?.typeName === "ZodBranded") {
    code = `${code}.brand()`;
  }

  return code;
}
