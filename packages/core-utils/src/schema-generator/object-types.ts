import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";
import { isSchemaObject } from "openapi3-ts/oas31";

import { shouldIncludeProperty } from "../shared/types.js";
import type { ZodSchemaCodeOptions, ZodSchemaResult } from "./types.js";
import { generateObjectCode } from "./object-properties.js";
import { addDefaultValue, addDescription } from "./utils.js";

/**
 * Handle object type conversion
 */
export function handleObjectType(
  schema: SchemaObject,
  result: ZodSchemaResult,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: Omit<ZodSchemaCodeOptions, "imports" | "isTopLevel"> = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    extraProps,
    recursiveContext,
    resolvedSchemas,
    schemaContext = "base",
  } = options;
  const shape: string[] = [];
  const requiredFields = schema.required || [];

  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      /* Filter properties based on schema context (readOnly/writeOnly) */
      if (!shouldIncludeProperty(propSchema, schemaContext)) {
        continue;
      }

      const propResult = zodSchemaToCode(propSchema, {
        currentSchemaName,
        imports: result.imports,
        recursiveContext,
        resolvedSchemas,
        schemaContext,
        skipDescription: true,
      });
      result.imports = new Set([...propResult.imports, ...result.imports]);

      const isRequired = requiredFields.includes(key);
      let propCode = isRequired
        ? propResult.code
        : `${propResult.code}.optional()`;

      if (isSchemaObject(propSchema)) {
        propCode = addDescription(propCode, propSchema.description);
      }

      shape.push(`${JSON.stringify(key)}: ${propCode}`);
    }
  }

  /*
   * Handle additionalProperties according to OpenAPI specification using the common function
   */
  const objectCodeResult = generateObjectCode(
    shape,
    schema.additionalProperties,
    zodSchemaToCode,
    {
      currentSchemaName,
      extraProps,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
    },
  );

  result.imports = objectCodeResult.imports;
  let code = objectCodeResult.code;

  // Add default value if present
  code = addDefaultValue(code, schema.default);

  result.code = code;
  return result;
}
