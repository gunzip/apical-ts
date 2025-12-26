import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { ResolvedSchemas } from "./schema-converter.js";

import { shouldIncludeProperty } from "../shared/types.js";
import { generateObjectCode } from "./object-properties.js";
import { addDefaultValue } from "./utils.js";

/**
 * Options for object type generation
 */
interface ObjectTypeOptions {
  currentSchemaName?: string;
  extraProps?: ExtraPropsMode;
  recursiveContext?: import("./recursive-handlers.js").RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  schemaContext?: SchemaContext;
}

type ZodSchemaCodeOptions = ObjectTypeOptions & {
  imports?: Set<string>;
  isTopLevel?: boolean;
};

// Import from schema-converter to avoid circular dependencies
interface ZodSchemaResult {
  code: string;
  extensibleEnumValues?: unknown[];
  imports: Set<string>;
}

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
  options: ObjectTypeOptions = {},
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
      });
      result.imports = new Set([...propResult.imports, ...result.imports]);

      const isRequired = requiredFields.includes(key);
      const propCode = isRequired
        ? propResult.code
        : `${propResult.code}.optional()`;

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
