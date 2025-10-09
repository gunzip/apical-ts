/* Standard Schema utilities for validation abstraction */

import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Standard Schema compatible validation result types
 */
export interface ValidationError {
  readonly data?: undefined;
  readonly error: {
    readonly issues: readonly StandardSchemaV1.Issue[];
  };
  readonly success: false;
}

export type ValidationResult<T> = ValidationError | ValidationSuccess<T>;

export interface ValidationSuccess<T> {
  readonly data: T;
  readonly error?: undefined;
  readonly success: true;
}

/**
 * Validates data using Standard Schema interface
 * Converts Standard Schema Result to Zod-like format for backward compatibility
 */
export async function validateWithStandardSchema<T>(
  schema: StandardSchemaV1<unknown, T>,
  data: unknown,
): Promise<ValidationResult<T>> {
  const result = schema["~standard"].validate(data);
  const resolvedResult = result instanceof Promise ? await result : result;

  if ("issues" in resolvedResult) {
    return {
      data: undefined,
      error: {
        issues: resolvedResult.issues || [],
      },
      success: false,
    };
  }

  return {
    data: resolvedResult.value,
    error: undefined,
    success: true,
  };
}

/**
 * Synchronous validation using Standard Schema interface
 * Throws if schema returns a Promise (async validation)
 */
export function validateWithStandardSchemaSync<T>(
  schema: StandardSchemaV1<unknown, T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema["~standard"].validate(data);

  if (result instanceof Promise) {
    throw new TypeError("Schema validation must be synchronous");
  }

  if ("issues" in result) {
    return {
      data: undefined,
      error: {
        issues: result.issues || [],
      },
      success: false,
    };
  }

  return {
    data: result.value,
    error: undefined,
    success: true,
  };
}
