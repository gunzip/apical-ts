import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./schema-converter.js";

/**
 * Result of object code generation
 */
export interface ObjectCodeResult {
  code: string;
  imports: Set<string>;
}

/**
 * Options for object property handling
 */
export interface ObjectPropertyOptions {
  currentSchemaName?: string;
  formatShape?: boolean;
  imports?: Set<string>;
  recursiveContext?: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
}

/**
 * Checks if additionalProperties allows additional properties
 * Returns true if undefined, true, or a schema object
 * Returns false only if explicitly set to false
 */
export function allowsAdditionalProperties(
  additionalProperties: SchemaObject["additionalProperties"],
): boolean {
  return additionalProperties !== false;
}

/**
 * Determines the object method to use based on additionalProperties
 * According to OpenAPI specification:
 * - false: no additional properties allowed (use z.strictObject)
 * - undefined/true: allow additional properties (use z.object)
 * - schema object: allow additional properties with validation (use z.object)
 */
export function determineObjectMethod(
  additionalProperties: SchemaObject["additionalProperties"],
): "z.object" | "z.strictObject" {
  return additionalProperties === false ? "z.strictObject" : "z.object";
}

/**
 * Generates object code with proper handling of additionalProperties
 */
export function generateObjectCode(
  shape: string[],
  additionalProperties: SchemaObject["additionalProperties"],
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ObjectPropertyOptions,
  ) => { code: string; imports: Set<string> },
  options: ObjectPropertyOptions = {},
): ObjectCodeResult {
  const objectMethod = determineObjectMethod(additionalProperties);
  const imports = options.imports || new Set<string>();

  /* Format shape based on options */
  const formattedShape = options.formatShape
    ? shape.map((s) => `  ${s}`).join(",\n")
    : shape.join(", ");

  const shapeContent = options.formatShape
    ? `{\n${formattedShape}\n}`
    : `{${formattedShape}}`;

  let code = `${objectMethod}(${shapeContent})`;

  /*
   * Handle additionalProperties according to OpenAPI specification:
   * - false: no additional properties allowed (already handled by z.strictObject)
   * - undefined or true: allow additional properties (already handled by z.object)
   * - schema object: allow additional properties matching the schema (use catchall)
   */
  if (requiresCatchallValidation(additionalProperties)) {
    /* Schema object - validate additional properties against the schema */
    const additionalResult = zodSchemaToCode(additionalProperties, {
      currentSchemaName: options.currentSchemaName,
      imports,
      recursiveContext: options.recursiveContext,
      resolvedSchemas: options.resolvedSchemas,
    });

    const mergedImports = new Set([...additionalResult.imports, ...imports]);
    code += `.catchall(${additionalResult.code})`;

    return {
      code,
      imports: mergedImports,
    };
  }

  return {
    code,
    imports,
  };
}

/**
 * Type guard to check if additionalProperties requires catchall validation
 * Returns true only if it's a schema object (not boolean or undefined)
 */
export function requiresCatchallValidation(
  additionalProperties: SchemaObject["additionalProperties"],
): additionalProperties is ReferenceObject | SchemaObject {
  return (
    additionalProperties !== undefined &&
    additionalProperties !== false &&
    additionalProperties !== true &&
    typeof additionalProperties === "object"
  );
}
