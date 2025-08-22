import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

/**
 * Union type for OpenAPI schema types
 */
export type OpenAPISchema = ReferenceObject | SchemaObject;

/**
 * Options for zodSchemaToCode function
 */
export type ZodSchemaCodeOptions = {
  imports?: Set<string>;
  isTopLevel?: boolean;
  strictValidation?: boolean;
};

/**
 * Result of converting an OpenAPI schema to Zod code
 *
 * @example
 * ```javascript
 * const result: ZodSchemaResult = {
 *   code: "z.object({ name: z.string(), age: z.number().optional() })",
 *   imports: new Set(['UserType', 'AddressSchema'])
 * };
 * ```
 */
export type ZodSchemaResult = {
  code: string;
  extensibleEnumValues?: unknown[];
  imports: Set<string>;
};
import { isSchemaObject } from "openapi3-ts/oas31";

import { handleRegularEnum } from "./enum-handlers.js";
import { handleObjectType } from "./object-types.js";
import {
  handleArrayType,
  handleBooleanType,
  handleNumberType,
  handleStringType,
} from "./primitive-types.js";
import { handleReference } from "./reference-handlers.js";
import { handleAllOfSchema, handleUnionSchema } from "./union-types.js";
import {
  analyzeTypeArray,
  cloneWithoutNullable,
  inferEffectiveType,
  isNullable,
  mergeImports,
} from "./utils.js";

/**
 * Converts an OpenAPI schema object to Zod validation code
 */
export function zodSchemaToCode(
  schema: ReferenceObject | SchemaObject,
  options: ZodSchemaCodeOptions = {},
): ZodSchemaResult {
  const { imports, strictValidation = false } = options;
  const result: ZodSchemaResult = {
    code: "",
    imports: imports || new Set<string>(),
  };

  // Handle reference objects
  if (!isSchemaObject(schema)) {
    return handleReference(schema, result);
  }

  // Handle OpenAPI 3.1.0 union types, e.g., type: ["string", "null"]
  const effectiveType = inferEffectiveType(schema);

  if (Array.isArray(effectiveType)) {
    const { isNullable: hasNull, nonNullTypes } =
      analyzeTypeArray(effectiveType);

    if (nonNullTypes.length === 1 && hasNull) {
      // e.g., type: ["string", "null"]
      const clone = { ...schema, type: nonNullTypes[0] };
      const subResult = zodSchemaToCode(clone as SchemaObject, {
        imports: result.imports,
        strictValidation,
      });
      result.code = `(${subResult.code}).nullable()`;
      mergeImports(result.imports, subResult.imports);
      return result;
    } else {
      // e.g., type: ["string", "number"]
      const subResults = effectiveType.map((t: string) =>
        zodSchemaToCode({ ...schema, type: t } as SchemaObject, {
          imports: result.imports,
          strictValidation,
        }),
      );
      const schemas = subResults.map((r: ZodSchemaResult) => r.code);
      subResults.forEach((r: ZodSchemaResult) => {
        mergeImports(result.imports, r.imports);
      });
      result.code = `z.union([${schemas.join(", ")}])`;
      return result;
    }
  }

  // Handle enum before type-specific logic, but only if not a string (strings need special extensible enum handling)
  if (schema.enum && Array.isArray(schema.enum) && effectiveType !== "string") {
    result.code = handleRegularEnum(schema.enum, schema.default);
    return result;
  }

  // Handle nullable (OpenAPI 3.0 style)
  if (isNullable(schema)) {
    const clone = cloneWithoutNullable(schema);
    const subResult = zodSchemaToCode(clone, {
      imports: result.imports,
      strictValidation,
    });
    result.code = `(${subResult.code}).nullable()`;
    mergeImports(result.imports, subResult.imports);
    return result;
  }

  // Handle composition schemas
  if (schema.allOf) {
    return handleAllOfSchema(schema.allOf, result, zodSchemaToCode, {
      strictValidation,
    });
  }

  if (schema.anyOf) {
    return handleUnionSchema(
      schema.anyOf,
      "anyOf",
      result,
      zodSchemaToCode,
      schema.discriminator,
      { strictValidation },
    );
  }

  if (schema.oneOf) {
    return handleUnionSchema(
      schema.oneOf,
      "oneOf",
      result,
      zodSchemaToCode,
      schema.discriminator,
      { strictValidation },
    );
  }

  // Handle primitive types
  if (effectiveType === "string") {
    return handleStringType(schema, result);
  }

  if (effectiveType === "number" || effectiveType === "integer") {
    return handleNumberType(schema, result);
  }

  if (effectiveType === "boolean") {
    return handleBooleanType(schema, result);
  }

  if (effectiveType === "array") {
    return handleArrayType(schema, result, zodSchemaToCode, {
      strictValidation,
    });
  }

  if (effectiveType === "object") {
    return handleObjectType(schema, result, zodSchemaToCode, {
      strictValidation,
    });
  }

  // Fallback
  result.code = "z.unknown()";
  return result;
}
