/*
 * Runtime helpers for ata-validator generated schemas.
 *
 * This file is emitted into the generated output at `schemas/runtime.ts`.
 * It provides the Standard Schema V1 adapter that wraps compiled ata-validator
 * modules and the shared types needed by parameter schemas.
 */

export const HELPERS_FILE_NAME = "runtime.ts";

export function getAtaHelpersFileContent(): string {
  return ATA_HELPERS_CONTENT;
}

const ATA_HELPERS_CONTENT = `import type { StandardSchemaV1 } from "@standard-schema/spec";

/*
 * Validation result type returned by ata-validator compiled modules.
 */
export interface AtaValidationError {
  keyword?: string;
  instancePath?: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
  message?: string;
}

export interface AtaValidResult<T = unknown> {
  valid: true;
  data: T;
  errors: readonly never[];
}

export interface AtaInvalidResult {
  valid: false;
  data?: never;
  errors: readonly AtaValidationError[];
}

export type AtaValidationResult<T = unknown> = AtaValidResult<T> | AtaInvalidResult;

/*
 * Wraps a compiled ata-validator validate function into a Standard Schema V1
 * compatible object. The resulting schema can be used with any framework that
 * supports Standard Schema (Fastify, tRPC, TanStack, etc.).
 */
export function createStandardSchema<T>(
  validateFn: (data: unknown) => AtaValidationResult<T>,
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "ata-validator",
      validate(value: unknown) {
        const result = validateFn(value);
        if (result.valid) {
          return { value: result.data };
        }
        return {
          issues: result.errors.map((e) => ({
            message: e.message || "Validation failed",
            path: e.instancePath
              ? e.instancePath.split("/").filter(Boolean).map((key) => ({ key }))
              : [],
          })),
        };
      },
    },
  } as StandardSchemaV1<unknown, T>;
}

/*
 * Creates a Standard Schema V1 compatible object schema from individual
 * property validators. Used for parameter schemas (query, path, headers).
 */
export function createObjectStandardSchema<T extends Record<string, unknown>>(
  propertyValidators: Record<string, (data: unknown) => AtaValidationResult>,
  requiredKeys: string[],
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "ata-validator",
      validate(value: unknown) {
        if (typeof value !== "object" || value === null) {
          return {
            issues: [{ message: "Expected an object", path: [] }],
          };
        }
        const obj = value as Record<string, unknown>;
        const issues: Array<{ message: string; path: Array<{ key: string }> }> = [];
        const result: Record<string, unknown> = {};

        for (const key of requiredKeys) {
          if (!(key in obj)) {
            issues.push({
              message: \`Missing required property '\${key}'\`,
              path: [{ key }],
            });
          }
        }

        for (const [key, validateProp] of Object.entries(propertyValidators)) {
          if (!(key in obj)) continue;
          const propResult = validateProp(obj[key]);
          if (propResult.valid) {
            result[key] = propResult.data;
          } else {
            for (const err of propResult.errors) {
              issues.push({
                message: err.message || "Validation failed",
                path: [{ key }, ...(err.instancePath
                  ? err.instancePath.split("/").filter(Boolean).map((k) => ({ key: k }))
                  : [])],
              });
            }
          }
        }

        if (issues.length > 0) {
          return { issues };
        }
        return { value: { ...obj, ...result } as T };
      },
    },
  } as StandardSchemaV1<unknown, T>;
}
`;
