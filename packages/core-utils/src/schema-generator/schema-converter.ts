import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type {
  ResolvedSchemas,
  ZodSchemaCodeOptions,
  ZodSchemaResult,
} from "./types.js";
import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { RecursiveContext } from "./recursive-handlers.js";

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
import { parseSchemaReference } from "./schema-references.js";
import { handleAllOfSchema, handleUnionSchema } from "./union-types.js";
import {
  addDefaultValue,
  addDescription,
  analyzeTypeArray,
  cloneWithoutDefault,
  cloneWithoutNullable,
  getDefaultValueOptions,
  inferEffectiveType,
  isNullable,
  mergeImports,
  mergeSets,
  toLiteralCode,
} from "./utils.js";
import type { DefaultValueOptions } from "./utils.js";

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
    formatOverrides,
    helpers,
    imports,
    recursiveContext,
    resolvedSchemas,
    schemaContext,
    skipDescription,
  } = options;
  const result = createResult(imports, helpers);

  const applyDesc = (res: ZodSchemaResult) => {
    if (!skipDescription) {
      res.code = addDescription(res.code, schema.description);
    }
    return res;
  };

  /* References — OpenAPI 3.1 allows $ref with sibling keywords like default */
  if (!isSchemaObject(schema)) {
    const refResult = handleReferenceWithContext(schema, result, {
      currentSchemaName,
      recursiveContext,
    });
    if ("default" in schema && schema.default !== undefined) {
      const defaultOpts = resolveRefDefaultOptions(schema, resolvedSchemas);
      refResult.code = addDefaultValue(
        refResult.code,
        schema.default,
        defaultOpts,
      );
    }
    return refResult;
  }

  const effectiveType = inferEffectiveType(schema);

  /* Multi-type (array) declarations */
  if (Array.isArray(effectiveType)) {
    return applyDesc(
      handleMultiTypeArray(
        schema,
        effectiveType,
        result,
        recursiveContext,
        currentSchemaName,
        resolvedSchemas,
        extraProps,
        formatOverrides,
      ),
    );
  }

  /* const values should be treated as literals */
  if (schema.const !== undefined) {
    result.code = toLiteralCode(schema.const);
    return applyDesc(result);
  }

  /* Non-string enums (string enums handled inside string primitive for extensibility) */
  if (schema.enum && Array.isArray(schema.enum) && effectiveType !== "string") {
    result.code = handleRegularEnum(schema.enum, schema.default);
    return applyDesc(result);
  }

  /* Nullable (OpenAPI 3.0) */
  if (isNullable(schema)) {
    return applyDesc(
      handleNullableSchema(
        schema,
        result,
        recursiveContext,
        currentSchemaName,
        resolvedSchemas,
        extraProps,
        formatOverrides,
      ),
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
    formatOverrides,
  );
  if (composition) {
    /* Apply default only to anyOf/oneOf — allOf produces objects where a
       primitive default (e.g. "off") would generate invalid Zod code. */
    if (schema.default !== undefined && !schema.allOf) {
      composition.code = addDefaultValue(
        composition.code,
        schema.default,
        getDefaultValueOptions(schema),
      );
    }
    return applyDesc(composition);
  }

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
    formatOverrides,
  );
  if (primitiveHandled) return applyDesc(primitiveHandled);

  /* Unknown fallback */
  result.code = "z.unknown()";
  return applyDesc(result);
}

/* Internal helper: creates an empty ZodSchemaResult reusing provided imports set when present */
function createResult(
  imports?: Set<string>,
  helpers?: ZodSchemaCodeOptions["helpers"],
): ZodSchemaResult {
  return {
    code: "",
    helpers: helpers || new Set(),
    imports: imports || new Set<string>(),
  };
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
  formatOverrides?: ZodSchemaCodeOptions["formatOverrides"],
): ZodSchemaResult {
  const { isNullable: hasNull, nonNullTypes } = analyzeTypeArray(effectiveType);
  if (nonNullTypes.length === 1 && hasNull) {
    // Strip the default before converting the non-null branch, otherwise
    // `default: null` would be emitted on the inner schema and produce invalid
    // Zod chains such as `z.number().default(null).nullable()`.
    const clone: SchemaObject = {
      ...cloneWithoutDefault(schema),
      type: nonNullTypes[0] as SchemaObject["type"],
    };
    const subResult = zodSchemaToCode(clone, {
      currentSchemaName,
      extraProps,
      formatOverrides,
      helpers: result.helpers,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
      skipDescription: true,
    });
    // Re-apply the default only after `.nullable()` so `null` remains a valid
    // default for nullable schemas.
    result.code = addDefaultValue(
      `(${subResult.code}).nullable()`,
      schema.default,
      getDefaultValueOptions(clone),
    );
    mergeImports(result.imports, subResult.imports);
    mergeSets(result.helpers, subResult.helpers);
    return result;
  }
  const subResults = effectiveType.map((t: string) =>
    zodSchemaToCode({ ...schema, type: t } as SchemaObject, {
      currentSchemaName,
      extraProps,
      formatOverrides,
      helpers: result.helpers,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
      skipDescription: true,
    }),
  );
  const schemas = subResults.map((r) => r.code);
  subResults.forEach((r) => {
    mergeImports(result.imports, r.imports);
    mergeSets(result.helpers, r.helpers);
  });
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
  formatOverrides?: ZodSchemaCodeOptions["formatOverrides"],
): ZodSchemaResult {
  // Same rationale as handleMultiTypeArray(): nullable defaults such as `null`
  // must be applied to the outer nullable schema, not to the inner non-null one.
  const clone = cloneWithoutDefault(cloneWithoutNullable(schema));
  const subResult = zodSchemaToCode(clone, {
    currentSchemaName,
    extraProps,
    formatOverrides,
    helpers: result.helpers,
    imports: result.imports,
    recursiveContext,
    resolvedSchemas,
    skipDescription: true,
  });
  result.code = addDefaultValue(
    `(${subResult.code}).nullable()`,
    schema.default,
    getDefaultValueOptions(clone),
  );
  mergeImports(result.imports, subResult.imports);
  mergeSets(result.helpers, subResult.helpers);
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
  formatOverrides?: ZodSchemaCodeOptions["formatOverrides"],
): undefined | ZodSchemaResult {
  if (effectiveType === "string") {
    return handleStringType(schema, result, formatOverrides);
  }
  if (effectiveType === "number" || effectiveType === "integer") {
    return handleNumberType(schema, result);
  }
  if (effectiveType === "boolean") return handleBooleanType(schema, result);
  if (effectiveType === "array") {
    return handleArrayType(schema, result, zodSchemaToCode, {
      currentSchemaName,
      extraProps,
      formatOverrides,
      recursiveContext,
      resolvedSchemas,
      schemaContext,
    });
  }
  if (effectiveType === "object") {
    return handleObjectType(schema, result, zodSchemaToCode, {
      currentSchemaName,
      extraProps,
      formatOverrides,
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
  formatOverrides?: ZodSchemaCodeOptions["formatOverrides"],
): undefined | ZodSchemaResult {
  if (schema.allOf) {
    return handleAllOfSchema(schema.allOf, result, zodSchemaToCode, {
      currentSchemaName,
      extraProps,
      formatOverrides,
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
        formatOverrides,
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
        formatOverrides,
        recursiveContext,
        resolvedSchemas,
      },
    );
  }
  return undefined;
}

/*
 * Resolve DefaultValueOptions for a $ref schema by looking up the referenced
 * schema in resolvedSchemas. Falls back to undefined when the ref cannot be
 * resolved, letting addDefaultValue use its default (untyped) behavior.
 */
function resolveRefDefaultOptions(
  schema: ReferenceObject,
  resolvedSchemas?: ResolvedSchemas,
): DefaultValueOptions | undefined {
  if (!resolvedSchemas || !schema.$ref) {
    return undefined;
  }
  const parsed = parseSchemaReference(schema.$ref);
  if (!parsed) {
    return undefined;
  }
  const resolved = resolvedSchemas[parsed.originalName];
  if (!resolved || !isSchemaObject(resolved)) {
    return undefined;
  }
  return getDefaultValueOptions(resolved);
}
