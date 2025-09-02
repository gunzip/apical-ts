import type { SchemaObject } from "openapi3-ts/oas31";

/**
 * Effective type after resolving union types and inference
 */
export type EffectiveType =
  | "array"
  | "boolean"
  | "integer"
  | "number"
  | "object"
  | "string"
  | string[]
  | undefined;

/**
 * Add default value to zod code if present in schema
 */
export function addDefaultValue(code: string, defaultValue: unknown): string {
  if (defaultValue === undefined) {
    return code;
  }

  const serializedDefault =
    typeof defaultValue === "string"
      ? JSON.stringify(defaultValue)
      : JSON.stringify(defaultValue);

  return `${code}.default(${serializedDefault})`;
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
  const reservedKeywords = new Set([
    "abstract",
    "any",
    "as",
    "async",
    "await",
    "boolean",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "constructor",
    "continue",
    "debugger",
    "declare",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "from",
    "function",
    "get",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "is",
    "let",
    "module",
    "namespace",
    "never",
    "new",
    "null",
    "number",
    "object",
    "package",
    "private",
    "protected",
    "public",
    "readonly",
    "require",
    "return",
    "set",
    "static",
    "string",
    "super",
    "switch",
    "symbol",
    "this",
    "throw",
    "true",
    "try",
    "type",
    "typeof",
    "undefined",
    "unique",
    "unknown",
    "var",
    "void",
    "while",
    "with",
    "yield",
  ]);

  if (reservedKeywords.has(sanitized.toLowerCase())) {
    sanitized = sanitized + "Schema";
  }

  return sanitized;
}
