import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { addDefaultValue } from "./utils.js";

/**
 * Options for object type generation
 */
interface ObjectTypeOptions {
  strictValidation?: boolean;
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
  const { strictValidation = false } = options;
  const shape: string[] = [];
  const requiredFields = schema.required || [];

  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propResult = zodSchemaToCode(propSchema, {
        imports: result.imports,
        strictValidation,
      });
      result.imports = new Set([...propResult.imports, ...result.imports]);

      const isRequired = requiredFields.includes(key);
      const propCode = isRequired
        ? propResult.code
        : `${propResult.code}.optional()`;

      shape.push(`${JSON.stringify(key)}: ${propCode}`);
    }
  }

  const objectMethod = strictValidation ? "z.strictObject" : "z.object";
  let code = `${objectMethod}({${shape.join(", ")}})`;

  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === "boolean") {
      code += ".catchall(z.unknown())";
    } else {
      const additionalResult = zodSchemaToCode(schema.additionalProperties, {
        imports: result.imports,
        strictValidation,
      });
      result.imports = new Set([
        ...additionalResult.imports,
        ...result.imports,
      ]);
      code += `.catchall(${additionalResult.code})`;
    }
  }

  // Add default value if present
  code = addDefaultValue(code, schema.default);

  result.code = code;
  return result;
}
