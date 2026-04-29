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

/*
 * Convert a value to its Zod literal code representation.
 * Returns `z.null()` for null, `z.unknown()` for non-primitive values
 * (arrays, objects), and properly serialised `z.literal(...)` for
 * strings, numbers, booleans, and bigints.
 */
export function toLiteralCode(value: unknown): string {
  if (value === null) {
    return "z.null()";
  }
  if (value === undefined || typeof value === "object") {
    return "z.unknown()";
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

/**
 * Add default value to zod code if present in schema
 */
export function addDefaultValue(
  code: string,
  defaultValue: unknown,
  options?: { bigint?: boolean },
): string {
  if (defaultValue === undefined) {
    return code;
  }

  if (options?.bigint) {
    return `${code}.default(${defaultValue}n)`;
  }

  const serializedDefault =
    typeof defaultValue === "string"
      ? JSON.stringify(defaultValue)
      : JSON.stringify(defaultValue);

  return `${code}.default(${serializedDefault})`;
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
