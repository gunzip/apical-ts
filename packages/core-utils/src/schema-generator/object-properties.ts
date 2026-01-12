import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode } from "../shared/types.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./types.js";

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
  extraProps?: ExtraPropsMode;
  formatShape?: boolean;
  imports?: Set<string>;
  recursiveContext?: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
}

/**
 * Determines the object method to use based on additionalProperties
 * According to OpenAPI specification:
 * - false: no additional properties allowed (use z.strictObject)
 * - undefined/true or schema object: use z.object
 */
export function determineObjectMethod(
  additionalProperties: SchemaObject["additionalProperties"],
): "z.object" | "z.strictObject" {
  // If additionalProperties is explicitly false, always use strict
  if (additionalProperties === false) {
    return "z.strictObject";
  }

  // - If additionalProperties is a schema object, always use regular object with catchall
  // - For undefined additionalProperties, the behavior depends on extraProps
  // - For additionalProperties true, always use z.object (extraProps is ignored)
  return "z.object";
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
  const imports = options.imports || new Set<string>();
  const extraProps = options.extraProps || "strip";

  /*
   * Special case: empty object with undefined/true additionalProperties
   * According to OpenAPI spec, this means "accept any properties"
   * Use z.object({}).catchall(z.unknown()) instead of z.object({}) to allow any properties
   */
  if (
    shape.length === 0 &&
    (additionalProperties === undefined || additionalProperties === true)
  ) {
    return {
      code: "z.object({}).catchall(z.unknown())",
      imports,
    };
  }

  // Determine schema strictness when additionalProperties is defined
  const objectMethod = determineObjectMethod(additionalProperties);

  /* Format shape based on options */
  const formattedShape = options.formatShape
    ? shape.map((s) => `  ${s}`).join(",\n")
    : shape.join(", ");

  const shapeContent = options.formatShape
    ? `{\n${formattedShape}\n}`
    : `{${formattedShape}}`;

  let code = `${objectMethod}(${shapeContent})`;

  /*
   * Handle additionalProperties and extraProps setting:
   * 1. If additionalProperties is false -> already handled by z.strictObject
   * 2. If additionalProperties is a schema object -> use catchall with validation
   * 3. If additionalProperties is undefined/true -> apply extraProps behavior
   */
  if (requiresAdditionalSchema(additionalProperties)) {
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

  // Determines object strictness based on extraProps
  // when additionalProperties is undefined
  if (additionalProperties === undefined) {
    if (extraProps === "loose") {
      code += ".loose()";
    } else if (extraProps === "strict") {
      code += ".strict()";
    }
    // For extraProps === "strip", we don't add anything (default Zod behavior)
  }

  /*
   * Handle additionalProperties: true for non-empty objects
   * Should allow any additional properties using catchall
   */
  if (additionalProperties === true) {
    code += ".catchall(z.unknown())";
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
export function requiresAdditionalSchema(
  additionalProperties: SchemaObject["additionalProperties"],
): additionalProperties is ReferenceObject | SchemaObject {
  return (
    additionalProperties !== undefined &&
    additionalProperties !== false &&
    additionalProperties !== true &&
    typeof additionalProperties === "object"
  );
}
