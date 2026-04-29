import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";
import path from "node:path";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./types.js";

import { analyzeReadWriteProperties } from "../shared/types.js";
import {
  findStringFormatOverrideByReferenceName,
  renderStringFormatOverrideImports,
} from "./format-overrides.js";
import { generateObjectCode } from "./object-properties.js";
import {
  createRecursiveContext,
  findReferencesInSchema,
} from "./recursive-handlers.js";
import { zodSchemaToCode } from "./schema-converter.js";
import { sanitizeIdentifier } from "./utils.js";

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
  const shape: string[] = [];
  const requiredFields = schema.required || [];
  const imports = new Set<string>();

  /* Process each property to generate the correct Zod code */
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const isRequired = requiredFields.includes(key);
    const isRecursive = isRecursiveProperty(
      propSchema,
      originalSchemaName,
      recursiveContext,
    );

    if (isRecursive && getRecursiveReferenceName(propSchema) !== undefined) {
      const referencedSchemaName = getRecursiveReferenceName(propSchema)!;
      if (referencedSchemaName !== name) {
        imports.add(referencedSchemaName);
      }
      const getterCode = generateGetterCode(key, propSchema, name, isRequired);
      shape.push(getterCode);
    } else if (isRecursive) {
      /*
       * Composition (allOf/anyOf/oneOf) containing a self-reference.
       * Generate code using zodSchemaToCode but wrap in a getter to defer
       * evaluation and avoid TypeScript "used before declaration" errors.
       */
      const propResult = zodSchemaToCode(propSchema, {
        currentSchemaName: name,
        extraProps,
        formatOverrides,
        imports: new Set(),
        recursiveContext,
        resolvedSchemas,
      });

      propResult.imports.forEach((imp) => {
        if (imp !== name) {
          imports.add(imp);
        }
      });

      const code = isRequired
        ? propResult.code
        : `${propResult.code}.optional()`;

      /*
       * Use precise return type when the composition resolves to a single
       * self-reference (e.g. allOf/anyOf/oneOf with one $ref to self).
       * Otherwise fall back to z.ZodTypeAny.
       */
      const compositionItems = !isReferenceObject(propSchema)
        ? (propSchema.allOf ?? propSchema.anyOf ?? propSchema.oneOf)
        : undefined;
      const singleRefTarget =
        compositionItems?.length === 1 && isReferenceObject(compositionItems[0])
          ? getSchemaNameFromReference(compositionItems[0].$ref)
          : undefined;
      const isSingleSelfReference = singleRefTarget === name;
      const baseType = isSingleSelfReference
        ? `typeof ${name}`
        : "z.ZodTypeAny";
      const returnType = isRequired ? baseType : `z.ZodOptional<${baseType}>`;
      shape.push(
        `get ${JSON.stringify(key)}(): ${returnType} { return ${code}; }`,
      );
    } else {
      const propResult = zodSchemaToCode(propSchema, {
        currentSchemaName: name,
        extraProps,
        formatOverrides,
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
  const recursiveTypeAlias = hasDirectSelfReference(schema, name)
    ? renderSchemaType(schema)
    : undefined;

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    schemaResult.code,
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
  recursiveTypeAlias?: string,
): string {
  if (extensibleEnumValues) {
    const enumValues = extensibleEnumValues
      .map((e: unknown) => JSON.stringify(e))
      .join(" | ");
    const typeContent = `export type ${name} = ${enumValues} | (string & {});`;
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    return `import * as z from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  } else {
    const schemaContent = recursiveTypeAlias
      ? `${commentSection}export const ${name}: z.ZodType<${name}> = ${schemaCode};`
      : `${commentSection}export const ${name} = ${schemaCode};`;
    const typeContent = recursiveTypeAlias
      ? `export type ${name} = ${recursiveTypeAlias};`
      : `export type ${name} = z.infer<typeof ${name}>;`;
    return `import * as z from 'zod';\n${importsSection}\n${typeContent}\n${schemaContent}`;
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
  const referencedSchemaName = getRecursiveReferenceName(propSchema) ?? name;
  const isCrossSchemaReference = referencedSchemaName !== name;
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
    const arrayItemType = isCrossSchemaReference
      ? "z.ZodTypeAny"
      : `typeof ${referencedSchemaName}`;
    const returnType = isRequired
      ? `z.ZodArray<${arrayItemType}>`
      : `z.ZodOptional<z.ZodArray<${arrayItemType}>>`;
    return baseGetter(`z.array(${referencedSchemaName})`, returnType);
  }

  /* All other cases (direct references, objects with nested references) - use schema directly */
  const returnType = isRequired
    ? isCrossSchemaReference
      ? "z.ZodTypeAny"
      : `typeof ${referencedSchemaName}`
    : isCrossSchemaReference
      ? "z.ZodOptional<z.ZodTypeAny>"
      : `z.ZodOptional<typeof ${referencedSchemaName}>`;
  return baseGetter(referencedSchemaName, returnType);
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

/* Helper function to check if a property is recursive */
function isRecursiveProperty(
  propSchema: ReferenceObject | SchemaObject,
  originalSchemaName: string,
  recursiveContext: RecursiveContext,
): boolean {
  /* Check for direct self-reference via $ref */
  if ("$ref" in propSchema) {
    const ref = propSchema.$ref;
    if (!ref) {
      return false;
    }
    const selfRef = `#/components/schemas/${originalSchemaName}`;
    const shortSelfRef = `#/${originalSchemaName}`;
    if (ref === selfRef || ref === shortSelfRef) {
      return true;
    }
    if (ref.startsWith("#/components/schemas/")) {
      const referencedSchema = getSchemaNameFromReference(ref);
      return !!(
        referencedSchema &&
        recursiveContext.recursiveSchemas.has(referencedSchema)
      );
    }
    return false;
  }

  /* Check for indirect self-references within schema properties */
  const refs = findReferencesInSchema(propSchema);
  const selfRef = `#/components/schemas/${originalSchemaName}`;
  const shortSelfRef = `#/${originalSchemaName}`;
  return refs.some((ref) => {
    if (ref === selfRef || ref === shortSelfRef) {
      return true;
    }
    const referencedSchema = getSchemaNameFromReference(ref);
    return !!(
      referencedSchema &&
      recursiveContext.recursiveSchemas.has(referencedSchema)
    );
  });
}

function getRecursiveReferenceName(
  propSchema: ReferenceObject | SchemaObject,
): string | undefined {
  if (isReferenceObject(propSchema)) {
    return getSchemaNameFromReference(propSchema.$ref);
  }

  if (
    propSchema.type === "array" &&
    propSchema.items &&
    isReferenceObject(propSchema.items)
  ) {
    return getSchemaNameFromReference(propSchema.items.$ref);
  }

  return undefined;
}

function getSchemaNameFromReference(ref: string): string | undefined {
  if (ref.startsWith("#/components/schemas/")) {
    return sanitizeIdentifier(ref.replace("#/components/schemas/", ""));
  }

  /* Handle short-form references like #/SchemaName */
  const shortFormMatch = /^#\/([^/]+)$/.exec(ref);
  if (shortFormMatch) {
    return sanitizeIdentifier(shortFormMatch[1]);
  }

  return undefined;
}

function hasDirectSelfReference(
  schema: SchemaObject,
  schemaName: string,
): boolean {
  return findReferencesInSchema(schema).some(
    (ref) => getSchemaNameFromReference(ref) === schemaName,
  );
}

function renderSchemaType(schema: ReferenceObject | SchemaObject): string {
  if (isReferenceObject(schema)) {
    return getSchemaNameFromReference(schema.$ref) ?? "unknown";
  }

  if (schema.enum?.length) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if ("const" in schema && schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  const compositionType = renderCompositionType(schema);
  const baseType = compositionType ?? renderSimpleSchemaType(schema);
  const isNullable = "nullable" in schema && schema.nullable === true;

  return isNullable ? `${baseType} | null` : baseType;
}

function renderCompositionType(schema: SchemaObject): string | undefined {
  if (schema.allOf?.length) {
    return schema.allOf.map(renderSchemaType).join(" & ");
  }

  if (schema.anyOf?.length) {
    return schema.anyOf.map(renderSchemaType).join(" | ");
  }

  if (schema.oneOf?.length) {
    return schema.oneOf.map(renderSchemaType).join(" | ");
  }

  return undefined;
}

function renderSimpleSchemaType(schema: SchemaObject): string {
  if (schema.type === "array" || schema.items) {
    return `Array<${renderSchemaType(schema.items ?? {})}>`;
  }

  if (
    schema.type === "object" ||
    schema.properties ||
    schema.additionalProperties !== undefined
  ) {
    return renderObjectSchemaType(schema);
  }

  if (Array.isArray(schema.type)) {
    return schema.type.map(renderPrimitiveType).join(" | ");
  }

  if (schema.type) {
    return renderPrimitiveType(schema.type);
  }

  return "unknown";
}

function renderObjectSchemaType(schema: SchemaObject): string {
  const requiredProperties = new Set(schema.required ?? []);
  const propertyEntries = Object.entries(schema.properties ?? {}).map(
    ([propertyName, propertySchema]) =>
      `${JSON.stringify(propertyName)}${requiredProperties.has(propertyName) ? "" : "?"}: ${renderSchemaType(propertySchema)}`,
  );
  const propertyType =
    propertyEntries.length > 0 ? `{ ${propertyEntries.join("; ")} }` : "{}";
  const additionalPropertiesType = renderAdditionalPropertiesType(
    schema.additionalProperties,
  );

  if (!additionalPropertiesType) {
    return propertyType;
  }

  return propertyEntries.length > 0
    ? `${propertyType} & ${additionalPropertiesType}`
    : additionalPropertiesType;
}

function renderAdditionalPropertiesType(
  additionalProperties: SchemaObject["additionalProperties"],
): string | undefined {
  if (additionalProperties === undefined || additionalProperties === false) {
    return undefined;
  }

  if (additionalProperties === true) {
    return "{ [key: string]: unknown }";
  }

  return `{ [key: string]: ${renderSchemaType(additionalProperties)} }`;
}

function renderPrimitiveType(
  type: Exclude<SchemaObject["type"], readonly string[] | undefined>,
): string {
  switch (type) {
    case "boolean":
      return "boolean";
    case "integer":
    case "number":
      return "number";
    case "null":
      return "null";
    case "string":
      return "string";
    default:
      return "unknown";
  }
}

// Export for testing
export { generateGetterCode };
