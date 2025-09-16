import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { RecursiveContext } from "./recursive-handlers.js";

import {
  createRecursiveContext,
  findReferencesInSchema,
} from "./recursive-handlers.js";
import { zodSchemaToCode } from "./schema-converter.js";

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
  recursiveContext?: RecursiveContext;
  strictValidation?: boolean;
}

/**
 * Generates file content for a recursive schema using getter syntax
 */
export async function generateRecursiveSchemaFile(
  name: string,
  schema: SchemaObject,
  recursiveContext: RecursiveContext,
  description?: string,
  options: SchemaGenerationOptions = {},
): Promise<SchemaFileResult> {
  const { strictValidation = false } = options;

  if (schema.type !== "object" || !schema.properties) {
    throw new Error(
      `Recursive schema ${name} must be an object with properties`,
    );
  }

  const originalSchemaName = name.endsWith("Strict") ? name.slice(0, -6) : name;

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
        strictValidation,
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
  const objectMethod = strictValidation ? "z.strictObject" : "z.object";
  const shapeContent = shape.join(",\n  ");
  const schemaCode = `${objectMethod}({\n  ${shapeContent}\n})`;

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
  const { recursiveContext, strictValidation = false } = options;

  const context = recursiveContext || createRecursiveContext();

  const schemaResult = zodSchemaToCode(schema, {
    currentSchemaName: name,
    isTopLevel: true,
    recursiveContext: context,
    strictValidation,
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

  return {
    content,
    fileName: `${name}.ts`,
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
  const baseGetter = (code: string) =>
    `get ${JSON.stringify(key)}() { return ${code}${isRequired ? "" : ".optional()"}; }`;

  /* Array with reference items - wrap in z.array() */
  if (
    !isReferenceObject(propSchema) &&
    propSchema.type === "array" &&
    propSchema.items &&
    isReferenceObject(propSchema.items)
  ) {
    return baseGetter(`z.array(${name})`);
  }

  /* All other cases (direct references, objects with nested references) - use schema directly */
  return baseGetter(name);
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
