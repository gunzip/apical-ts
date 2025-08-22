import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { mergeImports } from "./utils.js";

/**
 * Discriminator configuration for discriminated unions
 */
export type DiscriminatorConfig = {
  mapping?: Record<string, string>;
  propertyName: string;
};

/**
 * Union handling types
 */
export type UnionType = "anyOf" | "oneOf";

type ZodSchemaCodeOptions = {
  imports?: Set<string>;
  isTopLevel?: boolean;
  strictValidation?: boolean;
};

// Import from schema-converter to avoid circular dependencies
type ZodSchemaResult = {
  code: string;
  extensibleEnumValues?: unknown[];
  imports: Set<string>;
};

/**
 * Handle allOf schema composition
 */
export function handleAllOfSchema(
  schemas: (ReferenceObject | SchemaObject)[],
  result: ZodSchemaResult,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: { strictValidation?: boolean } = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  const subResults = schemas.map((s) =>
    zodSchemaToCode(s, { imports: result.imports, strictValidation }),
  );
  const schemaCodes = subResults.map((r) => r.code);
  subResults.forEach((r) => {
    mergeImports(result.imports, r.imports);
  });

  if (schemaCodes.length === 0) {
    result.code = "z.unknown()";
    return result;
  }
  if (schemaCodes.length === 1) {
    result.code = schemaCodes[0];
    return result;
  }

  // If all are objects, merge; else intersection
  result.code = schemaCodes.reduce(
    (acc, curr) => `z.intersection(${acc}, ${curr})`,
  );
  return result;
}

/**
 * Handle anyOf/oneOf union schemas with shared logic
 */
export function handleUnionSchema(
  schemas: (ReferenceObject | SchemaObject)[],
  unionType: UnionType,
  result: ZodSchemaResult,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  discriminator?: DiscriminatorConfig,
  options: { strictValidation?: boolean } = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  // Check if discriminator is present for discriminated unions
  if (discriminator && discriminator.propertyName) {
    const discriminatorProperty = discriminator.propertyName;
    const subResults = schemas.map((s) =>
      zodSchemaToCode(s, { imports: result.imports, strictValidation }),
    );
    const schemasCodes = subResults.map((r) => r.code);
    subResults.forEach((r) => {
      mergeImports(result.imports, r.imports);
    });

    if (schemasCodes.length === 0) {
      result.code = "z.unknown()";
      return result;
    }
    if (schemasCodes.length === 1) {
      result.code = schemasCodes[0];
      return result;
    }

    // Generate discriminated union - works for both anyOf and oneOf with discriminator
    result.code = `z.discriminatedUnion("${discriminatorProperty}", [${schemasCodes.join(", ")}])`;
    return result;
  }

  // Regular union without discriminator
  const subResults = schemas.map((s) =>
    zodSchemaToCode(s, { imports: result.imports, strictValidation }),
  );
  const schemasCodes = subResults.map((r) => r.code);
  subResults.forEach((r) => {
    mergeImports(result.imports, r.imports);
  });

  if (schemasCodes.length === 0) {
    result.code = "z.unknown()";
    return result;
  }
  if (schemasCodes.length === 1) {
    result.code = schemasCodes[0];
    return result;
  }

  if (unionType === "anyOf") {
    // anyOf: accepts values that match any of the schemas
    result.code = `z.union([${schemasCodes.join(", ")}])`;
  } else {
    // oneOf: must match exactly one schema - use superRefine for validation
    result.code = `z.any().superRefine((x, ctx) => {
  const schemas = [${schemasCodes.join(", ")}];
  const errors = schemas.reduce<z.ZodError[]>(
    (errors, schema) =>
      ((result) => (result.error ? [...errors, result.error] : errors))(
        schema.safeParse(x),
      ),
    [],
  );
  if (schemas.length - errors.length !== 1) {
    ctx.addIssue({
      code: "invalid_union",
      errors: errors.map(error => error.issues),
      message: "Invalid input: Should pass exactly one schema",
    });
  }
})`;
  }
  return result;
}
