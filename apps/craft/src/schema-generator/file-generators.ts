import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./schema-converter.js";

import { analyzeReadWriteProperties } from "../shared/types.js";
import { generateObjectCode } from "./object-properties.js";
import {
  createRecursiveContext,
  findReferencesInSchema,
} from "./recursive-handlers.js";
import { zodSchemaToCode } from "./schema-converter.js";

/**
 * Options for recursive schema file generation
 */
export interface RecursiveSchemaFileOptions {
  description?: string;
  extraProps?: ExtraPropsMode;
  name: string;
  originalSchemaName: string;
  recursiveContext: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  schema: SchemaObject;
}

/**
 * Schema file generation result
 */
export interface SchemaFileResult {
  content: string;
  fileName: string;
  /** Additional files for schema variants (re-exports) */
  variantFiles?: { content: string; fileName: string }[];
}

/**
 * Options for schema file generation
 */
export interface SchemaGenerationOptions {
  extraProps?: ExtraPropsMode;
  originalSchemaName?: string;
  recursiveContext?: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  schemaContext?: SchemaContext;
}

/**
 * Result of generating schema variants for readOnly/writeOnly handling
 */
export interface SchemaVariantsResult {
  hasVariants: boolean;
  requestContent?: string;
  responseContent?: string;
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
    name,
    originalSchemaName,
    recursiveContext,
    resolvedSchemas,
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
  const shape: string[] = [];
  const requiredFields = schema.required || [];
  const imports = new Set<string>();

  /* Process each property to generate the correct Zod code */
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const isRequired = requiredFields.includes(key);

    if (isRecursiveProperty(propSchema, originalSchemaName)) {
      const getterCode = generateGetterCode(key, propSchema, name, isRequired);
      shape.push(getterCode);
    } else {
      const propResult = zodSchemaToCode(propSchema, {
        currentSchemaName: name,
        extraProps,
        imports: new Set(),
        recursiveContext,
        resolvedSchemas,
      });

      propResult.imports.forEach((imp) => {
        if (imp !== name) {
          imports.add(imp);
        }
      });

      const propCode = isRequired
        ? propResult.code
        : `${propResult.code}.optional()`;

      shape.push(`${JSON.stringify(key)}: ${propCode}`);
    }
  }

  const importsSection = generateImportsSection(imports, name);

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

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    schemaCode,
  );

  return {
    content,
    fileName: `${name}.ts`,
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
  const { extraProps, recursiveContext, resolvedSchemas } = options;

  const context = recursiveContext || createRecursiveContext();

  const schemaResult = zodSchemaToCode(schema, {
    currentSchemaName: name,
    extraProps,
    isTopLevel: true,
    recursiveContext: context,
    resolvedSchemas,
  });

  const commentSection = generateCommentSection(description);
  const importsSection = generateImportsSection(schemaResult.imports, name);

  /* Generate readOnly/writeOnly variants if needed */
  const variants = generateSchemaVariants(name, schema);

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    schemaResult.code,
    schemaResult.extensibleEnumValues,
    variants,
  );

  /* Generate variant re-export files for proper import resolution */
  const variantFiles = generateVariantReexportFiles(name, variants);

  return {
    content,
    fileName: `${name}.ts`,
    variantFiles,
  };
}

/**
 * Generates schema variant content for readOnly/writeOnly properties using .omit()
 * Returns the code to append to the schema file for Request and Response variants
 */
export function generateSchemaVariants(
  name: string,
  schema: SchemaObject,
): SchemaVariantsResult {
  const analysis = analyzeReadWriteProperties(schema);

  if (!analysis.hasReadOnly && !analysis.hasWriteOnly) {
    return { hasVariants: false };
  }

  let requestContent: string | undefined;
  let responseContent: string | undefined;

  /* Generate Request variant (excludes readOnly properties) */
  if (analysis.hasReadOnly && analysis.readOnlyKeys.length > 0) {
    const omitKeys = analysis.readOnlyKeys
      .map((key) => `${JSON.stringify(key)}: true`)
      .join(", ");
    requestContent = `export const ${name}Request = ${name}.omit({ ${omitKeys} });
export type ${name}Request = z.infer<typeof ${name}Request>;`;
  }

  /* Generate Response variant (excludes writeOnly properties) */
  if (analysis.hasWriteOnly && analysis.writeOnlyKeys.length > 0) {
    const omitKeys = analysis.writeOnlyKeys
      .map((key) => `${JSON.stringify(key)}: true`)
      .join(", ");
    responseContent = `export const ${name}Response = ${name}.omit({ ${omitKeys} });
export type ${name}Response = z.infer<typeof ${name}Response>;`;
  }

  return {
    hasVariants: true,
    requestContent,
    responseContent,
  };
}

/* Helper function to assemble final file content */
function assembleFileContent(
  name: string,
  commentSection: string,
  importsSection: string,
  schemaCode: string,
  extensibleEnumValues?: unknown[],
  variants?: SchemaVariantsResult,
): string {
  const variantsContent = buildVariantsContent(variants);

  if (extensibleEnumValues) {
    const enumValues = extensibleEnumValues
      .map((e: unknown) => JSON.stringify(e))
      .join(" | ");
    const typeContent = `export type ${name} = ${enumValues} | (string & {});`;
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    return `import * as z from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}${variantsContent}`;
  } else {
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    const typeContent = `export type ${name} = z.infer<typeof ${name}>;`;
    return `import * as z from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}${variantsContent}`;
  }
}

/* Helper function to build variants content string */
function buildVariantsContent(variants?: SchemaVariantsResult): string {
  if (!variants?.hasVariants) {
    return "";
  }

  const parts: string[] = [];

  if (variants.requestContent) {
    parts.push(variants.requestContent);
  }

  if (variants.responseContent) {
    parts.push(variants.responseContent);
  }

  return parts.length > 0 ? "\n" + parts.join("\n") : "";
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

/* Helper function to generate getter code for recursive properties */
function generateGetterCode(
  key: string,
  propSchema: ReferenceObject | SchemaObject,
  name: string,
  isRequired: boolean,
): string {
  /**
   * Generate getter with proper TypeScript return type annotation to resolve circular reference issues.
   * This follows the pattern from Zod documentation: https://zod.dev/api?id=circularity-errors
   */
  const baseGetter = (code: string, returnType: string) =>
    `get ${JSON.stringify(key)}(): ${returnType} { return ${code}${isRequired ? "" : ".optional()"}; }`;

  /* Array with reference items - wrap in z.array() */
  if (
    !isReferenceObject(propSchema) &&
    propSchema.type === "array" &&
    propSchema.items &&
    isReferenceObject(propSchema.items)
  ) {
    const returnType = isRequired
      ? `z.ZodArray<typeof ${name}>`
      : `z.ZodOptional<z.ZodArray<typeof ${name}>>`;
    return baseGetter(`z.array(${name})`, returnType);
  }

  /* All other cases (direct references, objects with nested references) - use schema directly */
  const returnType = isRequired
    ? `typeof ${name}`
    : `z.ZodOptional<typeof ${name}>`;
  return baseGetter(name, returnType);
}

/* Helper function to generate imports section */
function generateImportsSection(
  imports: Set<string>,
  currentSchemaName: string,
): string {
  const importStatements = Array.from(imports)
    .filter((importName) => importName !== currentSchemaName) // Don't import self
    .map((importName) => `import { ${importName} } from "./${importName}.js";`)
    .join("\n");
  return importStatements ? `${importStatements}\n` : "";
}

/*
 * Generates re-export files for schema variants.
 * These files allow imports like `import { UserRequest } from "./UserRequest.js"`
 * which re-exports from the base schema file.
 *
 * We export only the value - TypeScript will handle type inference automatically.
 * The type is also exported from the base file, so imports work correctly.
 */
function generateVariantReexportFiles(
  baseName: string,
  variants?: SchemaVariantsResult,
): undefined | { content: string; fileName: string }[] {
  if (!variants?.hasVariants) {
    return undefined;
  }

  const files: { content: string; fileName: string }[] = [];

  if (variants.requestContent) {
    const variantName = `${baseName}Request`;
    files.push({
      content: `export { ${variantName} } from "./${baseName}.js";\n`,
      fileName: `${variantName}.ts`,
    });
  }

  if (variants.responseContent) {
    const variantName = `${baseName}Response`;
    files.push({
      content: `export { ${variantName} } from "./${baseName}.js";\n`,
      fileName: `${variantName}.ts`,
    });
  }

  return files.length > 0 ? files : undefined;
}

/* Helper function to check if a property is recursive */
function isRecursiveProperty(
  propSchema: ReferenceObject | SchemaObject,
  originalSchemaName: string,
): boolean {
  /* Check for direct self-reference via $ref */
  if ("$ref" in propSchema) {
    const ref = propSchema.$ref;
    const selfRef = `#/components/schemas/${originalSchemaName}`;
    const shortSelfRef = `#/${originalSchemaName}`;
    return ref === selfRef || ref === shortSelfRef;
  }

  /* Check for indirect self-references within schema properties */
  const refs = findReferencesInSchema(propSchema);
  const selfRef = `#/components/schemas/${originalSchemaName}`;
  const shortSelfRef = `#/${originalSchemaName}`;
  return refs.includes(selfRef) || refs.includes(shortSelfRef);
}

// Export for testing
export { generateGetterCode };
