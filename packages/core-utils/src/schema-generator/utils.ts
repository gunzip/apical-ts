import type { SchemaObject } from "openapi3-ts/oas31";

import { isReservedKeyword } from "../shared/reserved-keywords.js";

/**
 * Effective type after resolving union types and inference
 */
type EffectiveType =
  | "array"
  | "boolean"
  | "integer"
  | "number"
  | "object"
  | "string"
  | string[]
  | undefined;

export type SchemaType = "array" | "boolean" | "number" | "object" | "string";

export interface DefaultValueOptions {
  bigint?: boolean;
  itemSchemaType?: SchemaType;
  schemaType?: SchemaType;
}

/* Map an effective OpenAPI type to a SchemaType, normalising "integer" to "number" */
export function toSchemaType(type: string | undefined): SchemaType | undefined {
  if (type === "integer") return "number";
  if (
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    type === "array" ||
    type === "object"
  ) {
    return type;
  }
  return undefined;
}

/*
 * Convert a JSON-like literal value to its Zod schema code representation.
 * Arrays and objects are rendered structurally so generated schemas preserve
 * exact-value semantics without relying on `z.literal()` for non-primitives.
 */
export function toLiteralCode(value: unknown): string {
  if (value === null) {
    return "z.null()";
  }
  if (Array.isArray(value)) {
    return `z.tuple([${value.map((item) => toLiteralCode(item)).join(", ")}])`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(
      ([key, item]) => `${JSON.stringify(key)}: ${toLiteralCode(item)}`,
    );
    return `z.strictObject({${entries.join(", ")}})`;
  }
  if (value === undefined) {
    return "z.undefined()";
  }
  if (typeof value === "string") {
    return `z.literal(${JSON.stringify(value)})`;
  }
  if (typeof value === "bigint") {
    return `z.literal(${String(value)}n)`;
  }
  // number | boolean
  return `z.literal(${String(value)})`;
}

/*
 * Compare JSON-like literal values structurally so enum defaults are preserved
 * even when arrays or objects are not referentially equal.
 */
export function literalValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    return (
      left.length === right.length &&
      left.every((value, index) => literalValuesEqual(value, right[index]))
    );
  }

  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.hasOwn(rightRecord, key) &&
          literalValuesEqual(leftRecord[key], rightRecord[key]),
      )
    );
  }

  return false;
}

/* Add default value to zod code if present in schema, coercing mismatched types */
export function addDefaultValue(
  code: string,
  defaultValue: unknown,
  options?: DefaultValueOptions,
): string {
  if (defaultValue === undefined) {
    return code;
  }

  if (options?.bigint) {
    const literal = toBigIntLiteral(defaultValue);
    if (!literal) {
      return code;
    }
    return `${code}.default(${literal})`;
  }

  /* null is always valid (nullable schemas) — emit directly */
  if (defaultValue === null) {
    return `${code}.default(null)`;
  }

  let coerced: unknown = defaultValue;

  if (options?.schemaType === "boolean" && typeof defaultValue === "string") {
    const normalizedDefault = defaultValue.toLowerCase();

    if (normalizedDefault === "true") {
      coerced = true;
    } else if (normalizedDefault === "false") {
      coerced = false;
    } else {
      return code;
    }
  }

  if (options?.schemaType === "number" && typeof defaultValue === "string") {
    const parsed = Number(defaultValue);
    if (Number.isNaN(parsed)) {
      return code;
    }
    coerced = parsed;
  }

  /* Drop invalid scalar defaults for array types */
  if (options?.schemaType === "array" && !Array.isArray(defaultValue)) {
    return code;
  }

  // Coerce string elements to booleans only when the array item type is boolean
  if (
    options?.schemaType === "array" &&
    options.itemSchemaType === "boolean" &&
    Array.isArray(defaultValue)
  ) {
    coerced = defaultValue.map((el) => {
      if (typeof el === "string") {
        const lower = el.toLowerCase();
        if (lower === "true") return true;
        if (lower === "false") return false;
      }
      return el;
    });
  }

  /* Drop invalid string defaults for object types */
  if (options?.schemaType === "object" && typeof defaultValue === "string") {
    return code;
  }

  const serializedDefault = JSON.stringify(coerced);
  return `${code}.default(${serializedDefault})`;
}

export function getDefaultValueOptions(
  schema: SchemaObject,
): DefaultValueOptions {
  const effectiveType = inferEffectiveType(schema);
  const schemaType = Array.isArray(effectiveType)
    ? undefined
    : toSchemaType(effectiveType);

  if (schema.type === "integer" && schema.format === "int64") {
    return { bigint: true, schemaType };
  }

  const itemSchemaType =
    schemaType === "array" && schema.items && "type" in schema.items
      ? toSchemaType(schema.items.type as string)
      : undefined;

  return {
    itemSchemaType,
    schemaType,
  };
}

function toBigIntLiteral(defaultValue: unknown): string | undefined {
  if (typeof defaultValue === "bigint") {
    return `${defaultValue}n`;
  }

  if (typeof defaultValue === "number") {
    if (!Number.isSafeInteger(defaultValue)) {
      return undefined;
    }
    return `${BigInt(defaultValue)}n`;
  }

  if (typeof defaultValue === "string") {
    if (!/^[+-]?\d+$/.test(defaultValue)) {
      return undefined;
    }
    return `${BigInt(defaultValue)}n`;
  }

  return undefined;
}

/**
 * Add description to zod code if present in schema
 */
export function addDescription(
  code: string,
  description: string | undefined,
): string {
  if (!description) {
    return code;
  }

  // Use JSON.stringify to properly escape the description for JavaScript string
  return `${code}.describe(${JSON.stringify(description)})`;
}

/**
 * Check if a type array represents a nullable type (e.g., ["string", "null"])
 */
export function analyzeTypeArray(types: string[]): {
  isNullable: boolean;
  nonNullTypes: string[];
} {
  const nonNullTypes = types.filter((t: string) => t !== "null");
  const isNullable = types.includes("null");

  return {
    isNullable,
    nonNullTypes,
  };
}

/**
 * Create a clone of schema without the nullable property
 */
export function cloneWithoutNullable(schema: SchemaObject): SchemaObject {
  const clone = { ...schema };
  if ("nullable" in clone) {
    delete clone.nullable;
  }
  return clone;
}

/**
 * Create a clone of schema without the default property
 */
export function cloneWithoutDefault(schema: SchemaObject): SchemaObject {
  // Nullable handling temporarily removes defaults so they can be re-applied on
  // the outer nullable schema in the correct order.
  const clone = { ...schema };
  if ("default" in clone) {
    delete clone.default;
  }
  return clone;
}

/**
 * Determine the type of a schema when it's not explicitly defined
 */
export function inferEffectiveType(schema: SchemaObject): EffectiveType {
  let effectiveType = schema.type as EffectiveType;
  if (!effectiveType) {
    if (schema.properties || schema.additionalProperties) {
      effectiveType = "object";
    } else if (schema.items) {
      effectiveType = "array";
    }
  }
  return effectiveType;
}

/**
 * Check if a schema has nullable property (OpenAPI 3.0 style)
 */
export function isNullable(schema: SchemaObject): boolean {
  return "nullable" in schema && schema.nullable === true;
}

/**
 * Merge import sets
 */
export function mergeImports(
  target: Set<string>,
  ...sources: Set<string>[]
): void {
  for (const source of sources) {
    for (const item of source) {
      target.add(item);
    }
  }
}

/**
 * Sanitize a string to be a valid JavaScript/TypeScript identifier
 * Converts kebab-case, snake_case, and other invalid characters to camelCase
 * Throws an error if the input cannot be sanitized to a valid identifier
 */
export function sanitizeIdentifier(id: string): string {
  // Handle empty strings
  if (!id) {
    throw new Error("Cannot sanitize empty string to identifier");
  }

  // Remove leading/trailing whitespace
  const name = id.trim();

  // Handle empty strings after trimming
  if (!name) {
    throw new Error("Cannot sanitize whitespace-only string to identifier");
  }

  // Replace invalid characters with underscores first
  // Valid identifier chars: letters, digits, underscore, dollar sign
  let sanitized = name.replace(/[^a-zA-Z0-9_$]/g, "_");

  // Convert to camelCase: split on underscores/hyphens and capitalize each word after the first
  const parts = sanitized.split(/[-_]+/).filter((part) => part.length > 0);

  if (parts.length === 0) {
    throw new Error(
      `Cannot sanitize string '${name}' to identifier - no valid parts remaining`,
    );
  }

  sanitized = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part) {
      sanitized += part.charAt(0).toUpperCase() + part.slice(1);
    }
  }

  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sanitized)) {
    sanitized = "_" + sanitized;
  }

  // Ensure it's not empty after sanitization
  if (!sanitized) {
    throw new Error(
      `Cannot sanitize string '${name}' to identifier - result is empty`,
    );
  }

  // Handle JavaScript/TypeScript reserved keywords
  if (isReservedKeyword(sanitized)) {
    sanitized = sanitized + "Schema";
  }

  return sanitized;
}
