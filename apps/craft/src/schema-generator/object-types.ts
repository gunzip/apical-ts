import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type { ResolvedSchemas } from "./schema-converter.js";

import { addDefaultValue } from "./utils.js";

/**
 * Options for object type generation
 */
interface ObjectTypeOptions {
  currentSchemaName?: string;
  recursiveContext?: import("./recursive-handlers.js").RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
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
  const { currentSchemaName, recursiveContext, resolvedSchemas } = options;
  const shape: string[] = [];
  const requiredFields = schema.required || [];

  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propResult = zodSchemaToCode(propSchema, {
        currentSchemaName,
        imports: result.imports,
        recursiveContext,
        resolvedSchemas,
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
   * Handle additionalProperties according to OpenAPI specification:
   * - false: no additional properties allowed (use z.strictObject)
   * - undefined (not specified) or true: allow additional properties (use z.object)
   * - schema object: allow additional properties matching the schema (use z.object with catchall)
   */
  let code: string;
  if (schema.additionalProperties === false) {
    /* Explicitly set to false - no additional properties allowed */
    code = `z.strictObject({${shape.join(", ")}})`;
  } else if (
    schema.additionalProperties === true ||
    schema.additionalProperties === undefined
  ) {
    /* Explicitly set to true OR not specified - allow additional properties */
    code = `z.object({${shape.join(", ")}})`;
  } else if (schema.additionalProperties) {
    /* Schema object - validate additional properties against the schema */
    const additionalResult = zodSchemaToCode(schema.additionalProperties, {
      currentSchemaName,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
    });
    result.imports = new Set([...additionalResult.imports, ...result.imports]);
    code = `z.object({${shape.join(", ")}}).catchall(${additionalResult.code})`;
  } else {
    /* Fallback - should not happen */
    code = `z.object({${shape.join(", ")}})`;
  }

  // Add default value if present
  code = addDefaultValue(code, schema.default);

  result.code = code;
  return result;
}
