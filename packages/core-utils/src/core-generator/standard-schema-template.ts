export const standardSchemaTemplateContent = String.raw`import type { StandardSchemaV1 } from "@standard-schema/spec";

export type StandardSchemaIssues = ReadonlyArray<StandardSchemaV1.Issue>;

export interface StandardSchemaValidationError {
  readonly issues: StandardSchemaIssues;
}

export type StandardSchemaValidationResult<T> =
  | {
      readonly success: true;
      readonly value: T;
    }
  | {
      readonly success: false;
      readonly error: StandardSchemaValidationError;
    };

export async function validateStandardSchema<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  value: unknown,
): Promise<
  StandardSchemaValidationResult<StandardSchemaV1.InferOutput<TSchema>>
> {
  const validationResult = schema["~standard"].validate(value);
  const result =
    validationResult instanceof Promise
      ? await validationResult
      : validationResult;

  if (result.issues) {
    return {
      error: {
        issues: result.issues,
      },
      success: false,
    };
  }

  return {
    success: true,
    value: result.value,
  };
}

export function createStandardSchemaValidationError(
  message: string,
  path?: ReadonlyArray<PropertyKey | StandardSchemaV1.PathSegment>,
): StandardSchemaValidationError {
  return {
    issues: [
      {
        message,
        path,
      },
    ],
  };
}
`;
