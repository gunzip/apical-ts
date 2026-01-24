import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type {
  OpenAPISchema,
  ResolvedSchemas,
  ZodSchemaCodeOptions,
  ZodSchemaResult,
} from "./types.js";
import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { RecursiveContext } from "./recursive-handlers.js";

// Re-export types for backward compatibility
export type {
  OpenAPISchema,
  ResolvedSchemas,
  ZodSchemaCodeOptions,
  ZodSchemaResult,
} from "./types.js";
import { isSchemaObject } from "openapi3-ts/oas31";

import { handleRegularEnum } from "./enum-handlers.js";
import { handleObjectType } from "./object-types.js";
import {
  handleArrayType,
  handleBooleanType,
  handleNumberType,
  handleStringType,
} from "./primitive-types.js";
import { handleReferenceWithContext } from "./reference-handlers.js";
import { handleAllOfSchema, handleUnionSchema } from "./union-types.js";
import {
  addDescription,
  analyzeTypeArray,
  cloneWithoutDescription,
  cloneWithoutNullable,
  inferEffectiveType,
  isNullable,
  mergeImports,
} from "./utils.js";
import { SchemaObjectType } from "openapi3-ts/oas30";

/**
 * Converts an OpenAPI schema object to Zod validation code
 */
export function zodSchemaToCode(
  schema: ReferenceObject | SchemaObject,
  options: ZodSchemaCodeOptions = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    extraProps,
    imports,
    recursiveContext,
    resolvedSchemas,
    schemaContext,
  } = options;
  const result = createResult(imports);

  /* References */
  if (!isSchemaObject(schema)) {
    return handleReferenceWithContext(schema, result, {
      currentSchemaName,
      recursiveContext,
    });
  }

  /* Process the schema and get the base result */
  const baseResult = processSchemaObject(
    schema,
    result,
    currentSchemaName,
    extraProps,
    recursiveContext,
    resolvedSchemas,
    schemaContext,
  );

  /* Add description if present in the schema */
  baseResult.code = addDescription(baseResult.code, schema.description);

  return baseResult;
}

/**
 * Process a SchemaObject and return the Zod code result (without description)
 */
function processSchemaObject(
  schema: SchemaObject,
  result: ZodSchemaResult,
  currentSchemaName?: string,
  extraProps?: ExtraPropsMode,
  recursiveContext?: RecursiveContext,
  resolvedSchemas?: ResolvedSchemas,
  schemaContext?: SchemaContext,
): ZodSchemaResult {
  const effectiveType = inferEffectiveType(schema);

  /* Multi-type (array) declarations */
  if (Array.isArray(effectiveType)) {
    return handleMultiTypeArray(
      schema,
      effectiveType,
      result,
      recursiveContext,
      currentSchemaName,
      resolvedSchemas,
      extraProps,
    );
  }

  /* const values should be treated as literals */
  if (schema.const !== undefined) {
    result.code = `z.literal(${typeof schema.const === "string" ? JSON.stringify(schema.const) : schema.const})`;
    return result;
  }

  /* Non-string enums (string enums handled inside string primitive for extensibility) */
  if (schema.enum && Array.isArray(schema.enum) && effectiveType !== "string") {
    result.code = handleRegularEnum(schema.enum, schema.default);
    return result;
  }

  /* Nullable (OpenAPI 3.0) */
  if (isNullable(schema)) {
    return handleNullableSchema(
      schema,
      result,
      recursiveContext,
      currentSchemaName,
      resolvedSchemas,
      extraProps,
    );
  }

  /* Composition: allOf / anyOf / oneOf */
  const composition = tryHandleCompositions(
    schema,
    result,
    recursiveContext,
    currentSchemaName,
    resolvedSchemas,
    extraProps,
  );
  if (composition) return composition;

  /* Primitives & structured */
  const primitiveHandled = handlePrimitive(
    schema,
    effectiveType,
    result,
    recursiveContext,
    currentSchemaName,
    resolvedSchemas,
    extraProps,
    schemaContext,
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
  recursiveContext?: RecursiveContext,
  currentSchemaName?: string,
  resolvedSchemas?: ResolvedSchemas,
  extraProps?: ExtraPropsMode,
): ZodSchemaResult {
  const { isNullable: hasNull, nonNullTypes } = analyzeTypeArray(effectiveType);
  if (nonNullTypes.length === 1 && hasNull) {
    // Strip description - it will be added at the outer level
    const clone = cloneWithoutDescription({
      ...schema,
      type: nonNullTypes[0] as SchemaObjectType,
    });
    const subResult = zodSchemaToCode(clone as SchemaObject, {
      currentSchemaName,
      extraProps,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
    });
    result.code = `(${subResult.code}).nullable()`;
    mergeImports(result.imports, subResult.imports);
    return result;
  }
  // Strip description from all type variants - it will be added at the outer level
  const subResults = effectiveType.map((t: string) =>
    zodSchemaToCode(
      cloneWithoutDescription({
        ...schema,
        type: t as SchemaObjectType,
      }) as SchemaObject,
      {
        currentSchemaName,
        extraProps,
        imports: result.imports,
        recursiveContext,
        resolvedSchemas,
      },
    ),
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
  recursiveContext?: RecursiveContext,
  currentSchemaName?: string,
  resolvedSchemas?: ResolvedSchemas,
  extraProps?: ExtraPropsMode,
): ZodSchemaResult {
  // Strip both nullable and description - description will be added at the outer level
  const clone = cloneWithoutDescription(cloneWithoutNullable(schema));
  const subResult = zodSchemaToCode(clone, {
    currentSchemaName,
    extraProps,
    imports: result.imports,
    recursiveContext,
    resolvedSchemas,
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
  recursiveContext?: RecursiveContext,
  currentSchemaName?: string,
  resolvedSchemas?: ResolvedSchemas,
  extraProps?: ExtraPropsMode,
  schemaContext?: SchemaContext,
): undefined | ZodSchemaResult {
  if (effectiveType === "string") return handleStringType(schema, result);
  if (effectiveType === "number" || effectiveType === "integer") {
    return handleNumberType(schema, result);
  }
  if (effectiveType === "boolean") return handleBooleanType(schema, result);
  if (effectiveType === "array") {
    return handleArrayType(schema, result, zodSchemaToCode, {
      currentSchemaName,
      extraProps,
      recursiveContext,
      resolvedSchemas,
      schemaContext,
    });
  }
  if (effectiveType === "object") {
    return handleObjectType(schema, result, zodSchemaToCode, {
      currentSchemaName,
      extraProps,
      recursiveContext,
      resolvedSchemas,
      schemaContext,
    });
  }
  return undefined;
}

/* Internal helper: handles composition (allOf / anyOf / oneOf). Returns result when handled, undefined otherwise */
function tryHandleCompositions(
  schema: SchemaObject,
  result: ZodSchemaResult,
  recursiveContext?: RecursiveContext,
  currentSchemaName?: string,
  resolvedSchemas?: ResolvedSchemas,
  extraProps?: ExtraPropsMode,
): undefined | ZodSchemaResult {
  if (schema.allOf) {
    return handleAllOfSchema(schema.allOf, result, zodSchemaToCode, {
      currentSchemaName,
      extraProps,
      recursiveContext,
      resolvedSchemas,
    });
  }
  if (schema.anyOf) {
    return handleUnionSchema(
      schema.anyOf,
      "anyOf",
      result,
      zodSchemaToCode,
      schema.discriminator,
      {
        currentSchemaName,
        extraProps,
        recursiveContext,
        resolvedSchemas,
      },
    );
  }
  if (schema.oneOf) {
    return handleUnionSchema(
      schema.oneOf,
      "oneOf",
      result,
      zodSchemaToCode,
      schema.discriminator,
      {
        currentSchemaName,
        extraProps,
        recursiveContext,
        resolvedSchemas,
      },
    );
  }
  return undefined;
}
