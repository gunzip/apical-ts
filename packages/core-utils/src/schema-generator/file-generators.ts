import type { SchemaObject } from "openapi3-ts/oas31";
import path from "node:path";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { GeneratedSchemaHelper, ResolvedSchemas } from "./types.js";

import { analyzeReadWriteProperties } from "../shared/types.js";
import {
  findStringFormatOverrideByReferenceName,
  renderStringFormatOverrideImports,
} from "./format-overrides.js";
import { generateObjectCode } from "./object-properties.js";
import { buildRecursiveShape } from "./recursive-schema-properties.js";
import { createRecursiveContext } from "./recursive-handlers.js";
import { renderRecursiveTypeAlias } from "./recursive-type-renderer.js";
import { zodSchemaToCode } from "./schema-converter.js";

/**
 * Options for recursive schema file generation
 */
interface RecursiveSchemaFileOptions {
  description?: string;
  extraProps?: ExtraPropsMode;
  formatOverrides?: StringFormatOverrideRegistry;
  name: string;
  originalSchemaName: string;
  recursiveContext: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  schemaDirectory?: string;
  schema: SchemaObject;
}

/**
 * Schema file generation result
 */
interface SchemaFileResult {
  content: string;
  fileName: string;
  helpers?: Set<GeneratedSchemaHelper>;
  /** Additional schema variant files (complete schema files, not re-exports) */
  variantFiles?: SchemaFileResult[];
}

/**
 * Options for schema file generation
 */
interface SchemaGenerationOptions {
  extraProps?: ExtraPropsMode;
  formatOverrides?: StringFormatOverrideRegistry;
  originalSchemaName?: string;
  recursiveContext?: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  schemaDirectory?: string;
  schemaContext?: SchemaContext;
}

/**
 * Result of generating schema variants for readOnly/writeOnly handling
 */
export interface SchemaVariantsResult {
  hasRequest: boolean;
  hasResponse: boolean;
}

/**
 * Generates file content for a recursive schema using getter syntax
 */
export async function generateRecursiveSchemaFile(
  options: RecursiveSchemaFileOptions,
): Promise<SchemaFileResult> {
  const {
    description,
    extraProps,
    formatOverrides,
    name,
    originalSchemaName,
    recursiveContext,
    resolvedSchemas,
    schemaDirectory = ".",
    schema,
  } = options;

  /* Check if schema.type is "object" or an array containing "object" */
  const isObjectType =
    schema.type === "object" ||
    (Array.isArray(schema.type) && schema.type.includes("object"));

  if (!isObjectType || !schema.properties) {
    throw new Error(
      `Recursive schema ${name} must be an object with properties`,
    );
  }

  const commentSection = generateCommentSection(description);
  const { helpers, imports, shape } = buildRecursiveShape({
    extraProps,
    formatOverrides,
    name,
    originalSchemaName,
    recursiveContext,
    resolvedSchemas,
    schema,
  });

  /*
   * Use additionalProperties to determine object type and generate code using common function
   */
  const objectCodeResult = generateObjectCode(
    shape,
    schema.additionalProperties,
    zodSchemaToCode,
    {
      currentSchemaName: name,
      extraProps,
      formatShape: true,
      formatOverrides,
      helpers,
      imports,
      recursiveContext,
      resolvedSchemas,
    },
  );

  objectCodeResult.imports.forEach((imp) => {
    if (imp !== name) {
      imports.add(imp);
    }
  });

  const schemaCode = objectCodeResult.code;
  const importsSection = generateImportsSection(
    imports,
    name,
    path.join(schemaDirectory, `${name}.ts`),
    formatOverrides,
  );

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    schemaCode,
    objectCodeResult.helpers,
  );

  return {
    content,
    fileName: `${name}.ts`,
    helpers: objectCodeResult.helpers,
  };
}

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
  const {
    extraProps,
    recursiveContext,
    resolvedSchemas,
    schemaContext,
    schemaDirectory,
  } = options;

  const context = recursiveContext || createRecursiveContext();

  const schemaResult = zodSchemaToCode(schema, {
    currentSchemaName: name,
    extraProps,
    formatOverrides: options.formatOverrides,
    isTopLevel: true,
    recursiveContext: context,
    resolvedSchemas,
    schemaContext,
  });

  const commentSection = generateCommentSection(description);
  const importsSection = generateImportsSection(
    schemaResult.imports,
    name,
    path.join(schemaDirectory || ".", `${name}.ts`),
    options.formatOverrides,
  );
  const recursiveTypeAlias = renderRecursiveTypeAlias(schema, name);

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    schemaResult.code,
    schemaResult.helpers,
    schemaResult.extensibleEnumValues,
    recursiveTypeAlias,
  );

  /* Generate complete variant schema files if this is a base schema (no schemaContext) */
  let variantFiles: SchemaFileResult[] | undefined;
  if (!schemaContext) {
    const variants = generateSchemaVariants(schema);
    variantFiles = await generateVariantSchemaFiles(name, schema, variants, {
      extraProps,
      formatOverrides: options.formatOverrides,
      recursiveContext,
      resolvedSchemas,
      schemaDirectory,
    });
  }

  return {
    content,
    fileName: `${name}.ts`,
    helpers: schemaResult.helpers,
    variantFiles,
  };
}

/*
 * Analyzes schema to determine which variants (Request/Response) should be generated.
 * Returns metadata flags for variant generation, not the actual schema code.
 */
export function generateSchemaVariants(
  schema: SchemaObject,
): SchemaVariantsResult {
  const analysis = analyzeReadWriteProperties(schema);

  return {
    hasRequest: analysis.hasReadOnly,
    hasResponse: analysis.hasWriteOnly,
  };
}

/* Helper function to assemble final file content */
function assembleFileContent(
  name: string,
  commentSection: string,
  importsSection: string,
  schemaCode: string,
  helpers: Set<GeneratedSchemaHelper>,
  extensibleEnumValues?: unknown[],
  recursiveTypeAlias?: string,
): string {
  const helpersImport = buildHelpersImportSection(helpers);

  if (extensibleEnumValues) {
    const enumValues = extensibleEnumValues
      .map((e: unknown) => JSON.stringify(e))
      .join(" | ");
    const typeContent = `export type ${name} = ${enumValues} | (string & {});`;
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    return `import * as z from 'zod';\n${helpersImport}${importsSection}\n${schemaContent}\n${typeContent}`;
  } else {
    const schemaContent = recursiveTypeAlias
      ? `${commentSection}export const ${name}: z.ZodType<${name}> = ${schemaCode};`
      : `${commentSection}export const ${name} = ${schemaCode};`;
    const typeContent = recursiveTypeAlias
      ? `export type ${name} = ${recursiveTypeAlias};`
      : `export type ${name} = z.infer<typeof ${name}>;`;
    return `import * as z from 'zod';\n${helpersImport}${importsSection}\n${typeContent}\n${schemaContent}`;
  }
}

function buildHelpersImportSection(
  helpers: Set<GeneratedSchemaHelper>,
): string {
  if (helpers.size === 0) {
    return "";
  }

  const helperImports: string[] = [];
  if (helpers.has("exclusiveUnion")) {
    helperImports.push("exclusiveUnion");
  }

  if (helperImports.length === 0) {
    return "";
  }

  return `import { ${helperImports.join(", ")} } from "./runtime.js";\n`;
}

/* Helper function to generate comment section from description */
function generateCommentSection(description?: string): string {
  if (!description) return "";

  return `/**\n * ${description
    .replace(/\*\//g, "*\\/") // Escape */ to prevent breaking comment blocks
    .split("\n")
    .map((line) => line.trim())
    .join("\n * ")}\n */\n`;
}

/* Helper function to generate imports section */
function generateImportsSection(
  imports: Set<string>,
  currentSchemaName: string,
  filePath: string,
  formatOverrides?: StringFormatOverrideRegistry,
): string {
  const localImportStatements = Array.from(imports)
    .filter(
      (importName) =>
        importName !== currentSchemaName &&
        !findStringFormatOverrideByReferenceName(importName, formatOverrides),
    )
    .sort()
    .map((importName) => `import { ${importName} } from "./${importName}.js";`)
    .join("\n");
  const externalImportStatements = renderStringFormatOverrideImports(
    imports,
    formatOverrides,
    filePath,
  ).join("\n");
  const importStatements = [externalImportStatements, localImportStatements]
    .filter(Boolean)
    .join("\n");
  return importStatements ? `${importStatements}\n` : "";
}

/*
 * Generates complete schema files for schema variants (Request/Response).
 * Each variant is a standalone schema file with full Zod definitions.
 */
async function generateVariantSchemaFiles(
  baseName: string,
  schema: SchemaObject,
  variants: SchemaVariantsResult,
  options: SchemaGenerationOptions = {},
): Promise<SchemaFileResult[] | undefined> {
  if (!variants.hasRequest && !variants.hasResponse) {
    return undefined;
  }

  const files: SchemaFileResult[] = [];

  /* Generate Request variant file (excludes readOnly properties) */
  if (variants.hasRequest) {
    const requestName = `${baseName}Request`;
    const requestFile = await generateSchemaFile(
      requestName,
      schema,
      `Request schema for ${baseName} (excludes read-only properties)`,
      {
        ...options,
        schemaContext: "request",
      },
    );
    files.push(requestFile);
  }

  /* Generate Response variant file (excludes writeOnly properties) */
  if (variants.hasResponse) {
    const responseName = `${baseName}Response`;
    const responseFile = await generateSchemaFile(
      responseName,
      schema,
      `Response schema for ${baseName} (excludes write-only properties)`,
      {
        ...options,
        schemaContext: "response",
      },
    );
    files.push(responseFile);
  }

  return files.length > 0 ? files : undefined;
}

// Export for testing
export { generateGetterCode } from "./recursive-schema-properties.js";
