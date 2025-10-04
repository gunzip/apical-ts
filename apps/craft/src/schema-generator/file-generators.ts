import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";
import { z, type ZodTypeAny } from "zod";

import type { TransformContext } from "../core-generator/index.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./schema-converter.js";

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
}

/**
 * Options for schema file generation
 */
export interface SchemaGenerationOptions {
  originalSchemaName?: string;
  recursiveContext?: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  transformContext?: TransformContext;
  zodTransform?: (schema: ZodTypeAny, ctx: TransformContext) => ZodTypeAny;
}

/**
 * Generates file content for a recursive schema using getter syntax
 */
export async function generateRecursiveSchemaFile(
  options: RecursiveSchemaFileOptions,
): Promise<SchemaFileResult> {
  const {
    description,
    name,
    originalSchemaName,
    recursiveContext,
    resolvedSchemas,
    schema,
  } = options;

  if (schema.type !== "object" || !schema.properties) {
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
  const { recursiveContext, resolvedSchemas, transformContext, zodTransform } =
    options;

  const context = recursiveContext || createRecursiveContext();

  const schemaResult = zodSchemaToCode(schema, {
    currentSchemaName: name,
    isTopLevel: true,
    recursiveContext: context,
    resolvedSchemas,
  });

  /* Apply zodTransform if provided */
  let finalCode = schemaResult.code;
  if (zodTransform && transformContext) {
    finalCode = applyZodTransform(
      schemaResult.code,
      schemaResult.imports,
      zodTransform,
      transformContext,
      name,
    );
  }

  const commentSection = generateCommentSection(description);
  const importsSection = generateImportsSection(schemaResult.imports, name);

  const content = assembleFileContent(
    name,
    commentSection,
    importsSection,
    finalCode,
    schemaResult.extensibleEnumValues,
  );

  return {
    content,
    fileName: `${name}.ts`,
  };
}

/**
 * Applies a zodTransform to a Zod schema code string
 *
 * This function evaluates the generated schema code, applies the transform,
 * and serializes it back to code string format.
 */
function applyZodTransform(
  schemaCode: string,
  schemaImports: Set<string>,
  zodTransform: (schema: ZodTypeAny, ctx: TransformContext) => ZodTypeAny,
  transformContext: TransformContext,
  schemaName: string,
): string {
  try {
    /* eslint-disable no-console */

    /* Create evaluation context with zod */
    const evalGlobals: Record<string, ZodTypeAny> = { z };

    /* Add mock schemas for imports to prevent evaluation errors */
    for (const importName of schemaImports) {
      if (importName !== schemaName) {
        /* Create placeholder schemas that accept anything */
        evalGlobals[importName] = z.any();
      }
    }

    /* Evaluate the schema code to get a Zod schema instance */
    const evalFunc = new Function(
      ...Object.keys(evalGlobals),
      `"use strict"; return ${schemaCode}`,
    );
    const zodSchema = evalFunc(...Object.values(evalGlobals));

    /* Apply the transform */
    const transformedSchema = zodTransform(zodSchema, transformContext);

    /* Detect what transformations were applied and append them to the code */
    return serializeZodSchema(transformedSchema, schemaCode);
  } catch (error) {
    /* If transform fails, log warning and return original code */
    console.warn(
      `⚠️ Failed to apply zodTransform to ${transformContext.exportName}:`,
      error instanceof Error ? error.message : error,
    );
    return schemaCode;
  }
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
    return `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  } else {
    const schemaContent = `${commentSection}export const ${name} = ${schemaCode};`;
    const typeContent = `export type ${name} = z.infer<typeof ${name}>;`;
    return `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
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

/**
 * Serializes a Zod schema back to code string
 *
 * This is a simplified serializer that handles common transformations
 * by detecting them and appending the appropriate method calls.
 */
function serializeZodSchema(schema: ZodTypeAny, originalCode: string): string {
  /* Check if the schema has been modified by detecting common Zod methods */
  let code = originalCode;

  /* Check for .default() transformation - Zod v4 uses _def.type === "default" */
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

  /* Check for .transform() - this is trickier as we can't serialize the function */
  if (
    schema._def?.typeName === "ZodEffects" &&
    schema._def?.effect?.type === "transform"
  ) {
    /* We can't serialize arbitrary transform functions */
    /* The user would need to modify the generated code manually or use a different approach */
    /* For now, we just skip it */
  }

  /* Check for .refine() or .superRefine() */
  if (
    schema._def?.typeName === "ZodEffects" &&
    schema._def?.effect?.type === "refinement"
  ) {
    /* Can't serialize refinement functions either */
  }

  return code;
}

// Export for testing
export { generateGetterCode };
