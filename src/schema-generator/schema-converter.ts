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
  const result = createResult(imports);

  /* References */
  if (!isSchemaObject(schema)) {
    return handleReference(schema, result);
  }

  const effectiveType = inferEffectiveType(schema);

  /* Multi-type (array) declarations */
  if (Array.isArray(effectiveType)) {
    return handleMultiTypeArray(
      schema,
      effectiveType,
      result,
      strictValidation,
    );
  }

  /* Non-string enums (string enums handled inside string primitive for extensibility) */
  if (schema.enum && Array.isArray(schema.enum) && effectiveType !== "string") {
    result.code = handleRegularEnum(schema.enum, schema.default);
    return result;
  }

  /* Nullable (OpenAPI 3.0) */
  if (isNullable(schema)) {
    return handleNullableSchema(schema, result, strictValidation);
  }

  /* Composition: allOf / anyOf / oneOf */
  const composition = tryHandleCompositions(schema, result, strictValidation);
  if (composition) return composition;

  /* Primitives & structured */
  const primitiveHandled = handlePrimitive(
    schema,
    effectiveType,
    result,
    strictValidation,
  );
  if (primitiveHandled) return primitiveHandled;

  /* Unknown fallback */
  result.code = "z.unknown()";
  return result;
}

/* Internal helper: creates an empty ZodSchemaResult reusing provided imports set when present */
function createResult(imports?: Set<string>): ZodSchemaResult {
  return { code: "", imports: imports || new Set<string>() };
}

/* Internal helper: handles OpenAPI 3.1 multi-type (array) declarations like ["string","null"] */
function handleMultiTypeArray(
  schema: SchemaObject,
  effectiveType: string[],
  result: ZodSchemaResult,
  strictValidation: boolean,
): ZodSchemaResult {
  const { isNullable: hasNull, nonNullTypes } = analyzeTypeArray(effectiveType);
  if (nonNullTypes.length === 1 && hasNull) {
    const clone = { ...schema, type: nonNullTypes[0] };
    const subResult = zodSchemaToCode(clone as SchemaObject, {
      imports: result.imports,
      strictValidation,
    });
    result.code = `(${subResult.code}).nullable()`;
    mergeImports(result.imports, subResult.imports);
    return result;
  }
  const subResults = effectiveType.map((t: string) =>
    zodSchemaToCode({ ...schema, type: t } as SchemaObject, {
      imports: result.imports,
      strictValidation,
    }),
  );
  const schemas = subResults.map((r) => r.code);
  subResults.forEach((r) => mergeImports(result.imports, r.imports));
  result.code = `z.union([${schemas.join(", ")}])`;
  return result;
}

/* Internal helper: handles OpenAPI 3.0 nullable flag */
function handleNullableSchema(
  schema: SchemaObject,
  result: ZodSchemaResult,
  strictValidation: boolean,
): ZodSchemaResult {
  const clone = cloneWithoutNullable(schema);
  const subResult = zodSchemaToCode(clone, {
    imports: result.imports,
    strictValidation,
  });
  result.code = `(${subResult.code}).nullable()`;
  mergeImports(result.imports, subResult.imports);
  return result;
}

/* Internal helper: primitive type dispatch */
function handlePrimitive(
  schema: SchemaObject,
  effectiveType: string | undefined,
  result: ZodSchemaResult,
  strictValidation: boolean,
): undefined | ZodSchemaResult {
  if (effectiveType === "string") return handleStringType(schema, result);
  if (effectiveType === "number" || effectiveType === "integer") {
    return handleNumberType(schema, result);
  }
  if (effectiveType === "boolean") return handleBooleanType(schema, result);
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
  return undefined;
}

/* Internal helper: handles composition (allOf / anyOf / oneOf). Returns result when handled, undefined otherwise */
function tryHandleCompositions(
  schema: SchemaObject,
  result: ZodSchemaResult,
  strictValidation: boolean,
): undefined | ZodSchemaResult {
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
  return undefined;
}
