import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type { ZodSchemaCodeOptions, ZodSchemaResult } from "./types.js";
import type { ExtraPropsMode } from "../shared/types.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import type { SchemaContext } from "../shared/types.js";
import type { ResolvedSchemas } from "./types.js";

import {
  findStringFormatOverride,
  getStringFormatOverrideReferenceName,
} from "./format-overrides.js";
import { handleExtensibleEnum, handleRegularEnum } from "./enum-handlers.js";
import { addDefaultValue, toSchemaType } from "./utils.js";

/**
 * Handle array type conversion
 */
export function handleArrayType(
  schema: SchemaObject,
  result: ZodSchemaResult,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: {
    currentSchemaName?: string;
    extraProps?: ExtraPropsMode;
    formatOverrides?: ZodSchemaCodeOptions["formatOverrides"];
    recursiveContext?: RecursiveContext;
    resolvedSchemas?: ResolvedSchemas;
    schemaContext?: SchemaContext;
  } = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    extraProps,
    formatOverrides,
    recursiveContext,
    resolvedSchemas,
    schemaContext,
  } = options;
  if (!schema.items) {
    let code = "z.array(z.unknown())";
    code = addDefaultValue(code, schema.default, { schemaType: "array" });
    result.code = code;
    return result;
  }

  const itemsResult = zodSchemaToCode(schema.items, {
    currentSchemaName,
    extraProps,
    formatOverrides,
    imports: result.imports,
    recursiveContext,
    resolvedSchemas,
    schemaContext,
  });
  let code = `z.array(${itemsResult.code})`;
  result.imports = new Set([...itemsResult.imports, ...result.imports]);

  if (schema.minItems !== undefined) code += `.min(${schema.minItems})`;
  if (schema.maxItems !== undefined) code += `.max(${schema.maxItems})`;
  // uniqueItems not representable in code string

  // Resolve item schema type for default-value coercion
  const itemType =
    schema.items && "type" in schema.items
      ? toSchemaType(schema.items.type as string)
      : undefined;

  code = addDefaultValue(code, schema.default, {
    itemSchemaType: itemType,
    schemaType: "array",
  });

  result.code = code;
  return result;
}

/**
 * Handle boolean type conversion
 */
export function handleBooleanType(
  schema: SchemaObject,
  result: ZodSchemaResult,
): ZodSchemaResult {
  let code = "z.boolean()";

  // Handle enums for booleans (both single and multi-value, though rare)
  if (schema.enum && schema.enum.length >= 1) {
    code = handleRegularEnum(schema.enum, schema.default);
  } else {
    // Add default value if present and no enum
    code = addDefaultValue(code, schema.default, { schemaType: "boolean" });
  }

  result.code = code;
  return result;
}

/**
 * Handle number/integer type conversion
 */
export function handleNumberType(
  schema: SchemaObject,
  result: ZodSchemaResult,
): ZodSchemaResult {
  /* int64 maps to BigInt to avoid precision loss beyond Number.MAX_SAFE_INTEGER.
     z.coerce.bigint() accepts strings and numbers from JSON and coerces to BigInt. */
  if (schema.type === "integer" && schema.format === "int64") {
    let code = "z.coerce.bigint()";
    if (schema.minimum !== undefined) code += `.min(${schema.minimum}n)`;
    if (schema.maximum !== undefined) code += `.max(${schema.maximum}n)`;
    if (schema.exclusiveMinimum !== undefined)
      code += `.gt(${schema.exclusiveMinimum}n)`;
    if (schema.exclusiveMaximum !== undefined)
      code += `.lt(${schema.exclusiveMaximum}n)`;

    if (schema.enum && schema.enum.length >= 1) {
      code = handleRegularEnum(schema.enum, schema.default, { bigint: true });
    } else {
      code = addDefaultValue(code, schema.default, {
        bigint: true,
      });
    }

    result.code = code;
    return result;
  }

  let code = "z.number()";

  if (schema.minimum !== undefined) code += `.min(${schema.minimum})`;
  if (schema.maximum !== undefined) code += `.max(${schema.maximum})`;
  if (schema.exclusiveMinimum !== undefined)
    code += `.gt(${schema.exclusiveMinimum})`;
  if (schema.exclusiveMaximum !== undefined)
    code += `.lt(${schema.exclusiveMaximum})`;
  if (schema.type === "integer") code += ".int()";

  // Handle enums for numbers (both single and multi-value)
  if (schema.enum && schema.enum.length >= 1) {
    code = handleRegularEnum(schema.enum, schema.default);
  } else {
    // Add default value if present and no enum
    code = addDefaultValue(code, schema.default, { schemaType: "number" });
  }

  result.code = code;
  return result;
}

/**
 * Handle string type conversion
 */
export function handleStringType(
  schema: SchemaObject,
  result: ZodSchemaResult,
  formatOverrides?: ZodSchemaCodeOptions["formatOverrides"],
): ZodSchemaResult {
  // Handle x-extensible-enum first, as it takes precedence over regular enum
  const extensibleEnumResult = handleExtensibleEnum(schema);
  if (extensibleEnumResult) {
    result.code = extensibleEnumResult.code;
    result.extensibleEnumValues = extensibleEnumResult.enumValues;
    return result;
  }

  if (schema.enum && schema.enum.length >= 1) {
    result.code = handleRegularEnum(schema.enum, schema.default);
    return result;
  }

  const override = findStringFormatOverride(schema.format, formatOverrides);
  if (override) {
    const referenceName = getStringFormatOverrideReferenceName(override.format);
    result.imports.add(referenceName);
    result.code = addDefaultValue(referenceName, schema.default, {
      schemaType: "string",
    });
    return result;
  }

  let code = "z.string()";

  // Add string constraints
  if (schema.minLength !== undefined) code += `.min(${schema.minLength})`;
  if (schema.maxLength !== undefined) code += `.max(${schema.maxLength})`;

  if (schema.pattern)
    code += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;

  // Handle format-specific validations
  if (schema.format === "email") code = "z.email()";
  if (schema.format === "uuid") code = "z.uuid()";
  if (schema.format === "uri") code = "z.url()";
  if (schema.format === "date") code = "z.iso.date()";
  if (schema.format === "date-time")
    code = "z.iso.datetime({ offset: true, local: true })";
  if (schema.format === "time") code = "z.iso.time()";
  if (schema.format === "duration") code = "z.iso.duration()";

  // Although Blob and File (which extends Blob) can be used interchangeably,
  // it is recommended to use a File instance when uploading files.
  // Using File ensures the uploaded file retains its original name;
  // otherwise, the server will assign a default name.
  // When downloading files, browsers typically return a File instance,
  // while in Node.js, fetch returns a Blob instance.
  if (schema.format === "binary") code = "z.instanceof(Blob)";

  // Add default value if present and no enum
  code = addDefaultValue(code, schema.default, { schemaType: "string" });

  result.code = code;
  return result;
}
