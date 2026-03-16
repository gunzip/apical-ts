import type { SchemaObject } from "openapi3-ts/oas31";

import { addDefaultValue } from "./utils.js";

/**
 * Result of handling extensible enum
 */
export interface ExtensibleEnumResult {
  code: string;
  enumValues: unknown[];
}

/**
 * Handles x-extensible-enum for string schemas
 * Always generates inline array format for consistency
 */
export function handleExtensibleEnum(
  schema: SchemaObject,
): ExtensibleEnumResult | null {
  const extensibleEnum = schema["x-extensible-enum"];
  if (!extensibleEnum || !Array.isArray(extensibleEnum)) {
    return null;
  }

  // Always use inline array format
  const enumValues = extensibleEnum
    .map((e: unknown) => JSON.stringify(e))
    .join(", ");
  let code = `z.enum([${enumValues}]).or(z.string())`;

  // Add default value if present
  code = addDefaultValue(code, schema.default);

  return {
    code,
    enumValues: extensibleEnum,
  };
}

/**
 * Handle regular enum values
 */
export function handleRegularEnum(
  enumValues: unknown[],
  defaultValue?: unknown,
): string {
  // Single enum value should be a literal
  if (enumValues.length === 1) {
    const value = enumValues[0];
    const code = `z.literal(${typeof value === "string" ? JSON.stringify(value) : value})`;
    return addDefaultValue(
      code,
      defaultValue === value ? defaultValue : undefined,
    );
  }

  // Check if all values are strings
  const allStrings = enumValues.every((value) => typeof value === "string");

  let code: string;
  if (allStrings) {
    // Use z.enum for string-only enums
    code = `z.enum([${enumValues.map((e) => JSON.stringify(e)).join(", ")}])`;
  } else {
    // Use z.union of z.literal for mixed or non-string enums
    const literals = enumValues.map(
      (value) =>
        `z.literal(${typeof value === "string" ? JSON.stringify(value) : value})`,
    );
    code = `z.union([${literals.join(", ")}])`;
  }

  return addDefaultValue(
    code,
    enumValues.includes(defaultValue) ? defaultValue : undefined,
  );
}
