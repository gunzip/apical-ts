import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject, isSchemaObject } from "openapi3-ts/oas31";

import type { RecursiveContext } from "./recursive-handlers.js";
import type { ResolvedSchemas } from "./schema-converter.js";

import { mergeImports } from "./utils.js";

/**
 * Discriminator configuration for discriminated unions
 */
export interface DiscriminatorConfig {
  mapping?: Record<string, string>;
  propertyName: string;
}

/**
 * Union handling types
 */
export type UnionType = "anyOf" | "oneOf";

interface ZodSchemaCodeOptions {
  currentSchemaName?: string;
  imports?: Set<string>;
  isTopLevel?: boolean;
  recursiveContext?: RecursiveContext;
  resolvedSchemas?: ResolvedSchemas;
  strictValidation?: boolean;
}

// Import from schema-converter to avoid circular dependencies
interface ZodSchemaResult {
  code: string;
  extensibleEnumValues?: unknown[];
  imports: Set<string>;
}

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
  options: {
    currentSchemaName?: string;
    recursiveContext?: RecursiveContext;
    resolvedSchemas?: ResolvedSchemas;
    strictValidation?: boolean;
  } = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    recursiveContext,
    resolvedSchemas,
    strictValidation = false,
  } = options;

  // Check if all schemas are objects, including proper reference resolution
  const canUseObjectSpread = schemas.every((schema) => {
    if (isReferenceObject(schema)) {
      // It's a reference - check if it resolves to an object type
      if (resolvedSchemas) {
        const refName = extractSchemaNameFromRef(schema.$ref);
        if (refName) {
          const resolvedSchema = resolvedSchemas[refName];
          if (resolvedSchema && !("$ref" in resolvedSchema)) {
            // Check if the resolved schema is an object type (not a reference)
            return !resolvedSchema.type || resolvedSchema.type === "object";
          }
        }
      }
      // If we can't resolve the reference, assume it's not compatible for object spread
      return false;
    }
    // Check if it's an object type in case of inline schema
    return !schema.type || schema.type === "object";
  });

  if (canUseObjectSpread) {
    // Try object spread approach using .shape
    const shapeExpressions: string[] = [];
    const allImports = new Set<string>();

    // Collect all required fields from all schemas
    const allRequiredFields = collectRequiredFields(schemas);

    for (const schema of schemas) {
      if (isReferenceObject(schema)) {
        // Handle reference: extract Schema name and use .shape
        const refName = extractSchemaNameFromRef(schema.$ref);
        if (refName) {
          allImports.add(refName);
          shapeExpressions.push(`...${refName}.shape`);
        }
      } else if (
        (!schema.type || schema.type === "object") &&
        schema.properties
      ) {
        // Generate inline object for spread, applying required constraints
        const modifiedSchema = applyRequiredConstraints(
          schema,
          allRequiredFields,
        );
        const subResult = zodSchemaToCode(modifiedSchema, {
          currentSchemaName,
          imports: new Set(),
          recursiveContext,
          resolvedSchemas,
          strictValidation,
        });
        subResult.imports.forEach((imp) => allImports.add(imp));
        shapeExpressions.push(`...${subResult.code}.shape`);
      }
      // Empty objects with only required (no properties)
      // are handled by the required collection above
    }

    if (shapeExpressions.length > 0) {
      const objectMethod = strictValidation ? "z.strictObject" : "z.object";
      result.code = `${objectMethod}({${shapeExpressions.join(", ")}})`;
      allImports.forEach((imp) => result.imports.add(imp));
      return result;
    }
  }

  // Fallback to intersection approach
  // ie. in case of non-object types
  const subResults = schemas.map((s) =>
    zodSchemaToCode(s, {
      currentSchemaName,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
      strictValidation,
    }),
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

  // Generate nested intersections
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
  options: {
    currentSchemaName?: string;
    recursiveContext?: RecursiveContext;
    resolvedSchemas?: ResolvedSchemas;
    strictValidation?: boolean;
  } = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    recursiveContext,
    resolvedSchemas,
    strictValidation = false,
  } = options;
  // Check if discriminator is present for discriminated unions
  if (discriminator && discriminator.propertyName) {
    const discriminatorProperty = discriminator.propertyName;
    const subResults = schemas.map((s) =>
      zodSchemaToCode(s, {
        currentSchemaName,
        imports: result.imports,
        recursiveContext,
        resolvedSchemas,
        strictValidation,
      }),
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
    zodSchemaToCode(s, {
      currentSchemaName,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
      strictValidation,
    }),
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

/**
 * Apply required constraints to a schema if the field exists in properties
 */
function applyRequiredConstraints(
  schema: SchemaObject,
  allRequiredFields: Set<string>,
): SchemaObject {
  if (!schema.properties || allRequiredFields.size === 0) {
    return schema;
  }

  const schemaFields = Object.keys(schema.properties);
  const requiredForThisSchema = schemaFields.filter((field) =>
    allRequiredFields.has(field),
  );

  if (requiredForThisSchema.length === 0) {
    return schema;
  }

  const requiredSet = new Set(schema.required || []);
  return {
    ...schema,
    required: [
      ...(schema.required || []),
      ...requiredForThisSchema.filter((field) => !requiredSet.has(field)),
    ],
  };
}

/**
 * Collect all required fields from allOf schemas
 */
function collectRequiredFields(
  schemas: (ReferenceObject | SchemaObject)[],
): Set<string> {
  const allRequiredFields = new Set<string>();
  for (const schema of schemas) {
    if (isSchemaObject(schema) && schema.required) {
      schema.required.forEach((field) => allRequiredFields.add(field));
    }
  }
  return allRequiredFields;
}

/**
 * Extract schema name from OpenAPI reference string
 * @param ref - Reference string like "#/components/schemas/SchemaName"
 * @returns Schema name or null if extraction fails
 */
function extractSchemaNameFromRef(ref: string | undefined): null | string {
  if (!ref) return null;
  const refMatch = ref.match(/\/([^/]+)$/);
  return refMatch ? refMatch[1] : null;
}
