import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject, isSchemaObject } from "openapi3-ts/oas31";

import type {
  ZodSchemaCodeOptions,
  ZodSchemaResult,
  ResolvedSchemas,
} from "./types.js";
import type { ExtraPropsMode } from "../shared/types.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";
import type { RecursiveContext } from "./recursive-handlers.js";
import { buildDiscriminatedUnionCode } from "./discriminated-union.js";
import { parseSchemaReference } from "./schema-references.js";
import { mergeImports, sanitizeIdentifier } from "./utils.js";

/**
 * Discriminator configuration for discriminated unions
 */
interface DiscriminatorConfig {
  mapping?: Record<string, string>;
  propertyName: string;
}

/**
 * Union handling types
 */
type UnionType = "anyOf" | "oneOf";

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
    extraProps?: ExtraPropsMode;
    formatOverrides?: StringFormatOverrideRegistry;
    recursiveContext?: RecursiveContext;
    resolvedSchemas?: ResolvedSchemas;
    strictValidation?: boolean;
  } = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    extraProps,
    formatOverrides,
    recursiveContext,
    resolvedSchemas,
  } = options;

  /*
   * Avoid object spread when allOf contains a self-reference.
   * Spreading ...SelfSchema.shape would invoke getters on the shape object,
   * causing infinite recursion for self-referencing properties.
   * Fall back to the intersection approach which uses schema names directly.
   */
  const containsSelfReference =
    currentSchemaName &&
    schemas.some((schema) => {
      if (isReferenceObject(schema)) {
        const refName = parseSchemaReference(schema.$ref);
        return (
          refName !== undefined &&
          sanitizeIdentifier(refName.originalName) === currentSchemaName
        );
      }
      return false;
    });

  /*
   * Partition allOf members into object-spreadable and non-object schemas.
   * Object schemas can be merged via .shape spread; non-object schemas (enum,
   * union, discriminated union, intersection) must use z.intersection().
   */
  const objectSchemas: (ReferenceObject | SchemaObject)[] = [];
  const nonObjectSchemas: (ReferenceObject | SchemaObject)[] = [];

  if (!containsSelfReference) {
    for (const schema of schemas) {
      if (isObjectSchemaType(schema, resolvedSchemas)) {
        objectSchemas.push(schema);
      } else {
        nonObjectSchemas.push(schema);
      }
    }
  }

  /*
   * Use .shape spread optimization only when ALL allOf members are plain
   * objects. When non-object schemas are present (mixed case), fall through
   * to the full intersection approach which preserves object-level behaviors
   * like .catchall(), strict mode, etc.
   */
  if (objectSchemas.length > 0 && nonObjectSchemas.length === 0) {
    const shapeExpressions: string[] = [];
    const allImports = new Set<string>();
    const allRequiredFields = collectRequiredFields(schemas);

    for (const schema of objectSchemas) {
      if (isReferenceObject(schema)) {
        const refName = parseSchemaReference(schema.$ref);
        if (refName) {
          allImports.add(refName.identifierName);
          shapeExpressions.push(`...${refName.identifierName}.shape`);
        }
      } else if (
        (!schema.type || schema.type === "object") &&
        schema.properties
      ) {
        const modifiedSchema = applyRequiredConstraints(
          schema,
          allRequiredFields,
        );
        const subResult = zodSchemaToCode(modifiedSchema, {
          currentSchemaName,
          extraProps,
          formatOverrides,
          imports: new Set(),
          recursiveContext,
          resolvedSchemas,
        });
        subResult.imports.forEach((imp) => allImports.add(imp));
        shapeExpressions.push(`...${subResult.code}.shape`);
      }
    }

    if (shapeExpressions.length > 0) {
      result.code = `z.object({${shapeExpressions.join(", ")}})`;
      allImports.forEach((imp) => result.imports.add(imp));
      return result;
    }
  }

  // Fallback to full intersection approach
  // (self-references, all non-object types, or no shape expressions generated)
  const subResults = schemas.map((s) =>
    zodSchemaToCode(s, {
      currentSchemaName,
      extraProps,
      formatOverrides,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
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
    extraProps?: ExtraPropsMode;
    formatOverrides?: StringFormatOverrideRegistry;
    recursiveContext?: RecursiveContext;
    resolvedSchemas?: ResolvedSchemas;
  } = {},
): ZodSchemaResult {
  const {
    currentSchemaName,
    extraProps,
    formatOverrides,
    recursiveContext,
    resolvedSchemas,
  } = options;
  // Check if discriminator is present for discriminated unions
  if (discriminator && discriminator.propertyName) {
    const discriminatorProperty = discriminator.propertyName;
    const subResults = schemas.map((s) =>
      zodSchemaToCode(s, {
        currentSchemaName,
        extraProps,
        formatOverrides,
        imports: result.imports,
        recursiveContext,
        resolvedSchemas,
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

    result.code = buildDiscriminatedUnionCode({
      discriminatorProperty,
      mapping: discriminator.mapping,
      members: schemas.map((schema, index) => ({
        code: schemasCodes[index],
        schema,
      })),
      resolvedSchemas,
    });
    return result;
  }

  // Regular union without discriminator
  const subResults = schemas.map((s) =>
    zodSchemaToCode(s, {
      currentSchemaName,
      extraProps,
      formatOverrides,
      imports: result.imports,
      recursiveContext,
      resolvedSchemas,
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
    // oneOf: must match exactly one schema - delegate to exclusiveUnion helper
    result.code = `exclusiveUnion([${schemasCodes.join(", ")}])`;
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

/*
 * Check whether a schema is safe to treat as object-like for .shape spreads.
 * Object-only allOf compositions still flatten to z.object(...), while enums,
 * literals, unions, and mixed allOf compositions must avoid .shape.
 */
function isObjectSchemaType(
  schema: ReferenceObject | SchemaObject,
  resolvedSchemas?: ResolvedSchemas,
  seenRefs = new Set<string>(),
): boolean {
  if (isReferenceObject(schema)) {
    if (!resolvedSchemas) return false;
    const refName = parseSchemaReference(schema.$ref);
    if (!refName) return false;
    if (seenRefs.has(refName.originalName)) return false;
    const resolved = resolvedSchemas[refName.originalName];
    if (!resolved) return false;
    return isObjectSchemaType(
      resolved,
      resolvedSchemas,
      new Set(seenRefs).add(refName.originalName),
    );
  }

  if (
    schema.enum ||
    schema.const !== undefined ||
    schema.oneOf ||
    schema.anyOf
  ) {
    return false;
  }

  if (schema.allOf) {
    return schema.allOf.every((member) =>
      isObjectSchemaType(member, resolvedSchemas, seenRefs),
    );
  }

  return !schema.type || schema.type === "object";
}
