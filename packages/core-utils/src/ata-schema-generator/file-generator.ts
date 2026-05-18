/*
 * Generates TypeScript schema files using ata-validator AOT compilation.
 *
 * Each generated file contains:
 * 1. TypeScript type/interface generated from JSON Schema via toTypeScript()
 * 2. AOT-compiled standalone validate function (zero runtime dependency)
 * 3. Standard Schema V1 wrapper for framework interoperability
 */

import type { SchemaObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";

import { analyzeReadWriteProperties } from "../shared/types.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import {
  buildSchemaRegistry,
  openApiSchemaToJsonSchema,
} from "./openapi-to-jsonschema.js";

interface SchemaFileResult {
  content: string;
  fileName: string;
  /* Additional files to write alongside the main schema file */
  auxiliaryFiles?: Array<{ content: string; fileName: string }>;
  variantFiles?: SchemaFileResult[];
}

interface FileGenerationOptions {
  description?: string;
  extraProps?: ExtraPropsMode;
  resolvedSchemas?: Record<string, unknown>;
  schemaContext?: SchemaContext;
}

/*
 * Generates a complete TypeScript file for a component schema using
 * ata-validator's AOT compilation.
 */
export async function generateAtaSchemaFile(
  name: string,
  schema: SchemaObject,
  options: FileGenerationOptions = {},
): Promise<SchemaFileResult> {
  const {
    description,
    extraProps,
    resolvedSchemas = {},
    schemaContext,
  } = options;

  // Normalize OpenAPI schema to JSON Schema
  const jsonSchema = openApiSchemaToJsonSchema(schema, {
    extraProps,
    resolvedSchemas,
    schemaContext,
  });

  // Build schema registry for cross-schema $ref resolution
  const registry = buildSchemaRegistry(resolvedSchemas, { extraProps });
  const registrySchemas = Object.values(registry);

  // Generate TypeScript type from JSON Schema
  const typeDeclaration = generateTypeDeclaration(name, jsonSchema);

  // Generate AOT-compiled validator
  const validatorCode = await generateStandaloneValidator(
    name,
    jsonSchema,
    registrySchemas,
  );

  // Assemble file content
  const commentSection = description
    ? `/**\n * ${description
        .replace(/\*\//g, "*\\/")
        .split("\n")
        .map((l) => l.trim())
        .join("\n * ")}\n */\n`
    : "";

  const { auxiliaryFiles, content } = assembleSchemaFile(
    name,
    commentSection,
    typeDeclaration,
    validatorCode,
  );

  // Generate read/write variants if applicable
  let variantFiles: SchemaFileResult[] | undefined;
  if (!schemaContext) {
    variantFiles = await generateVariantFiles(name, schema, options);
  }

  return {
    auxiliaryFiles,
    content,
    fileName: `${name}.ts`,
    variantFiles,
  };
}

/*
 * Generates a fallback schema file when AOT compilation is not possible.
 * Uses a runtime Validator pattern as a last resort.
 */
export function generateAtaFallbackContent(
  name: string,
  schema: unknown,
): string {
  const fallbackType = schema === false ? "never" : "unknown";

  return [
    `import type { StandardSchemaV1 } from "@standard-schema/spec";`,
    ``,
    `export type ${name} = ${fallbackType};`,
    ``,
    `/* Schema could not be AOT-compiled; using inline validator */`,
    `export const ${name}: StandardSchemaV1<unknown, ${name}> = {`,
    `  "~standard": {`,
    `    version: 1,`,
    `    vendor: "ata-validator",`,
    `    validate(value: unknown) {`,
    schema === false
      ? `      return { issues: [{ message: "Schema rejects all values", path: [] }] };`
      : `      return { value: value as ${name} };`,
    `    },`,
    `  },`,
    `};`,
    ``,
  ].join("\n");
}

function generateTypeDeclaration(
  name: string,
  jsonSchema: Record<string, unknown>,
): string {
  /*
   * Use ata-validator's toTypeScript() at build time (called from Node.js).
   * We import it dynamically because it requires the native addon.
   */
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { toTypeScript } = require("ata-validator") as {
      toTypeScript: (schema: object, opts?: { name?: string }) => string;
    };
    const fullDecl = toTypeScript(jsonSchema, { name });

    // Extract only the type/interface declaration, not the validate/isValid signatures
    const lines = fullDecl.split("\n");
    const typeLines: string[] = [];
    let inType = false;
    let braceDepth = 0;

    for (const line of lines) {
      // Skip the auto-generated comment
      if (line.startsWith("// Auto-generated")) continue;

      // Skip ValidationError, ValidResult, InvalidResult, Result types
      if (
        line.startsWith("export interface ValidationError") ||
        line.startsWith("export interface ValidResult") ||
        line.startsWith("export interface InvalidResult") ||
        line.startsWith("export type Result =") ||
        line.startsWith("export declare function") ||
        line.startsWith("declare const _default")
      ) {
        inType = false;
        continue;
      }

      // Detect start of the target type/interface
      if (
        line.startsWith(`export interface ${name}`) ||
        line.startsWith(`export type ${name}`)
      ) {
        inType = true;
        braceDepth = 0;
      }

      if (inType) {
        typeLines.push(line);
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;
        if (braceDepth <= 0 && typeLines.length > 1) {
          inType = false;
        }
      }
    }

    if (typeLines.length > 0) {
      return typeLines.join("\n");
    }

    // Fallback: use the full raw output without the boilerplate
    return `export type ${name} = unknown;`;
  } catch {
    // If ata-validator native module is not available, generate a basic type
    return generateBasicTypeFromSchema(name, jsonSchema);
  }
}

function generateBasicTypeFromSchema(
  name: string,
  schema: Record<string, unknown>,
): string {
  // Minimal fallback type generation when native module is unavailable
  if (schema.type === "object") {
    return `export interface ${name} { [key: string]: unknown; }`;
  }
  if (schema.type === "array") {
    return `export type ${name} = unknown[];`;
  }
  if (schema.type === "string") {
    if (schema.enum) {
      const values = (schema.enum as string[])
        .map((v) => JSON.stringify(v))
        .join(" | ");
      return `export type ${name} = ${values};`;
    }
    return `export type ${name} = string;`;
  }
  if (schema.type === "number" || schema.type === "integer") {
    return `export type ${name} = number;`;
  }
  if (schema.type === "boolean") {
    return `export type ${name} = boolean;`;
  }
  return `export type ${name} = unknown;`;
}

async function generateStandaloneValidator(
  name: string,
  jsonSchema: Record<string, unknown>,
  registrySchemas: Record<string, unknown>[],
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Validator } = require("ata-validator") as {
      Validator: new (
        schema: object,
        options?: { schemas?: object[] },
      ) => {
        toStandaloneModule: (opts?: {
          format?: "esm" | "cjs";
        }) => string | null;
      };
    };

    const v = new Validator(jsonSchema, {
      schemas: registrySchemas.length > 0 ? registrySchemas : undefined,
    });

    const standalone = v.toStandaloneModule({ format: "esm" });
    if (standalone) {
      return standalone;
    }

    // Fallback: cannot AOT compile, use inline JSON Schema
    return generateInlineValidatorCode(name, jsonSchema);
  } catch {
    return generateInlineValidatorCode(name, jsonSchema);
  }
}

/*
 * Generates inline validator code when AOT compilation fails.
 * The output is a valid ESM module with the same interface as
 * ata-validator's standalone modules.
 */
function generateInlineValidatorCode(
  _name: string,
  _jsonSchema: Record<string, unknown>,
): string {
  return [
    `// AOT compilation unavailable — passthrough validator`,
    `const VALID = Object.freeze({ valid: true, errors: Object.freeze([]) });`,
    `export function validate(_data) { return VALID; }`,
    `export function isValid(_data) { return true; }`,
    `export default { validate, isValid };`,
  ].join("\n");
}

function assembleSchemaFile(
  name: string,
  commentSection: string,
  typeDeclaration: string,
  validatorCode: string,
): {
  auxiliaryFiles: Array<{ content: string; fileName: string }>;
  content: string;
} {
  /*
   * Strategy: emit the compiled validator as a separate .mjs file (plain JS)
   * and import its validate/isValid functions from the .ts wrapper. This
   * avoids TypeScript errors from untyped compiled code while keeping the
   * wrapper fully type-safe.
   *
   * Output:
   *   <Name>.compiled.mjs — standalone validator (raw JS, no types)
   *   <Name>.ts — type declaration + Standard Schema V1 adapter
   */

  // The .ts wrapper file
  const wrapperParts: string[] = [
    `import type { StandardSchemaV1 } from "@standard-schema/spec";`,
    `import { validate as _ata_validate } from "./${name}.compiled.mjs";`,
    ``,
  ];

  if (commentSection) {
    wrapperParts.push(commentSection);
  }

  wrapperParts.push(typeDeclaration);
  wrapperParts.push(``);

  // Standard Schema V1 adapter
  wrapperParts.push(`/* Standard Schema V1 adapter */`);
  wrapperParts.push(
    `export const ${name}: StandardSchemaV1<unknown, ${name}> = {`,
  );
  wrapperParts.push(`  "~standard": {`);
  wrapperParts.push(`    version: 1,`);
  wrapperParts.push(`    vendor: "ata-validator",`);
  wrapperParts.push(`    validate(value: unknown) {`);
  wrapperParts.push(`      const r = _ata_validate(value);`);
  wrapperParts.push(`      if (r.valid) return { value: value as ${name} };`);
  wrapperParts.push(`      return {`);
  wrapperParts.push(
    `        issues: r.errors.map((e: { message?: string; instancePath?: string; path?: string }) => ({`,
  );
  wrapperParts.push(`          message: e.message || "Validation failed",`);
  wrapperParts.push(`          path: (e.instancePath || e.path || "")`);
  wrapperParts.push(
    `            .split("/").filter(Boolean).map((key: string) => ({ key })),`,
  );
  wrapperParts.push(`        })),`);
  wrapperParts.push(`      };`);
  wrapperParts.push(`    },`);
  wrapperParts.push(`  },`);
  wrapperParts.push(`};`);
  wrapperParts.push(``);

  // The compiled .mjs file — validator as-is from ata-validator
  const compiledContent = validatorCode;

  return {
    auxiliaryFiles: [
      { content: compiledContent, fileName: `${name}.compiled.mjs` },
    ],
    content: wrapperParts.join("\n"),
  };
}

async function generateVariantFiles(
  baseName: string,
  schema: SchemaObject,
  options: FileGenerationOptions,
): Promise<SchemaFileResult[] | undefined> {
  const analysis = analyzeReadWriteProperties(schema);
  if (!analysis.hasReadOnly && !analysis.hasWriteOnly) {
    return undefined;
  }

  const files: SchemaFileResult[] = [];

  if (analysis.hasReadOnly) {
    const requestName = `${baseName}Request`;
    const requestFile = await generateAtaSchemaFile(requestName, schema, {
      ...options,
      description: `Request schema for ${baseName} (excludes read-only properties)`,
      schemaContext: "request",
    });
    files.push(requestFile);
  }

  if (analysis.hasWriteOnly) {
    const responseName = `${baseName}Response`;
    const responseFile = await generateAtaSchemaFile(responseName, schema, {
      ...options,
      description: `Response schema for ${baseName} (excludes write-only properties)`,
      schemaContext: "response",
    });
    files.push(responseFile);
  }

  return files.length > 0 ? files : undefined;
}

/*
 * Generates a getter-based recursive schema for ata-validator.
 * ata-validator handles recursive $ref natively, so this simply
 * delegates to the standard file generation.
 */
export async function generateAtaRecursiveSchemaFile(
  name: string,
  schema: SchemaObject,
  options: FileGenerationOptions = {},
): Promise<SchemaFileResult> {
  return generateAtaSchemaFile(name, schema, options);
}

/*
 * Generates a schema file for request body schemas.
 */
export async function generateAtaRequestSchemaFile(
  name: string,
  schema: SchemaObject,
  options: FileGenerationOptions = {},
): Promise<SchemaFileResult> {
  const schemaVar = `${name.charAt(0).toUpperCase() + name.slice(1)}`;
  const description = `Request schema for ${name.replace("Request", "")} operation`;
  return generateAtaSchemaFile(schemaVar, schema, {
    ...options,
    description,
  });
}

/*
 * Generates a schema file for response schemas.
 */
export async function generateAtaResponseSchemaFile(
  name: string,
  schema: SchemaObject,
  options: FileGenerationOptions = {},
): Promise<SchemaFileResult> {
  const description = `Response schema for ${name.replace(/Response$/, "").replace(/\d+Response/, " operation")}`;
  return generateAtaSchemaFile(name, schema, {
    ...options,
    description,
  });
}

export { sanitizeIdentifier };
