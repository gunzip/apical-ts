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
  /** Additional schema variant files (complete schema files, not re-exports) */
  variantFiles?: SchemaFileResult[];
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
  const { extraProps, recursiveContext, resolvedSchemas, schemaContext } =
    options;

  const context = recursiveContext || createRecursiveContext();

  const schemaResult = zodSchemaToCode(schema, {
    currentSchemaName: name,
    extraProps,
    isTopLevel: true,
    recursiveContext: context,
    resolvedSchemas,
    schemaContext,
  });

  const commentSection = generateCommentSection(description);
  const importsSection = generateImportsSection(schemaResult.imports, name);

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    schemaResult.code,
    schemaResult.extensibleEnumValues,
  );

  /* Generate complete variant schema files if this is a base schema (no schemaContext) */
  let variantFiles: SchemaFileResult[] | undefined;
  if (!schemaContext) {
    const variants = generateSchemaVariants(schema);
    variantFiles = await generateVariantSchemaFiles(name, schema, variants, {
      extraProps,
      recursiveContext,
      resolvedSchemas,
    });
  }

  return {
    content,
    fileName: `${name}.ts`,
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
  extensibleEnumValues?: unknown[],
): string {
  if (extensibleEnumValues) {
    const enumValues = extensibleEnumValues
      .map((e: unknown) => JSON.stringify(e))
      .join(" | ");
    const typeContent = `export type ${name} = ${enumValues} | (string & {});`;
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    return `import * as z from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  } else {
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    const typeContent = `export type ${name} = z.infer<typeof ${name}>;`;
    return `import * as z from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  }
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
