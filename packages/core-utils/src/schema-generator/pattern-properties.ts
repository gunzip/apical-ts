import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isSchemaObject } from "openapi3-ts/oas31";

import type { ZodSchemaCodeOptions, ZodSchemaResult } from "./types.js";

/*
 * patternProperties is a valid JSON Schema keyword preserved at runtime in
 * OpenAPI 3.1 schemas but not explicitly typed on openapi3-ts SchemaObject.
 * This interface provides typed access to that runtime data.
 */
interface SchemaWithPatternProperties extends SchemaObject {
  patternProperties?: Record<string, ReferenceObject | SchemaObject>;
}

/**
 * Result of analyzing pattern properties for code generation
 */
export interface PatternPropertiesResult {
  keyCode: string;
  valueCode: string;
  imports: Set<string>;
}

/*
 * Extract patternProperties from a schema. Returns undefined when absent.
 */
export function getPatternProperties(
  schema: SchemaObject,
): Record<string, ReferenceObject | SchemaObject> | undefined {
  const extended = schema as SchemaWithPatternProperties;
  if (
    !extended.patternProperties ||
    typeof extended.patternProperties !== "object"
  ) {
    return undefined;
  }

  const entries = Object.entries(extended.patternProperties);
  if (entries.length === 0) {
    return undefined;
  }

  return extended.patternProperties;
}

/*
 * Generate a combined value schema from all patternProperties entries.
 * When a single pattern exists, use its schema directly.
 * When multiple patterns exist, wrap their schemas in z.union([...]).
 */
export function generatePatternPropertiesValueCode(
  patternProperties: Record<string, ReferenceObject | SchemaObject>,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: ZodSchemaCodeOptions = {},
): PatternPropertiesResult {
  const imports = options.imports || new Set<string>();
  const entries = Object.entries(patternProperties);
  const valueResults = entries.map(([, valueSchema]) =>
    zodSchemaToCode(valueSchema, {
      currentSchemaName: options.currentSchemaName,
      formatOverrides: options.formatOverrides,
      imports,
      recursiveContext: options.recursiveContext,
      resolvedSchemas: options.resolvedSchemas,
      skipDescription: true,
    }),
  );

  for (const r of valueResults) {
    for (const imp of r.imports) {
      imports.add(imp);
    }
  }

  const valueCode =
    valueResults.length === 1
      ? valueResults[0].code
      : `z.union([${valueResults.map((r) => r.code).join(", ")}])`;

  const keyCode = generateKeyCode(undefined, options, zodSchemaToCode, imports);

  return { imports, keyCode, valueCode };
}

/*
 * Generate a key schema from propertyNames.
 * - enum → z.enum([...])
 * - pattern → z.string().regex(...)
 * - fallback → z.string()
 */
export function generatePropertyNamesKeyCode(
  propertyNames: ReferenceObject | SchemaObject,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  options: ZodSchemaCodeOptions = {},
): { code: string; imports: Set<string> } {
  const imports = options.imports || new Set<string>();

  if (!isSchemaObject(propertyNames)) {
    /* Reference — delegate to zodSchemaToCode */
    const refResult = zodSchemaToCode(propertyNames, {
      currentSchemaName: options.currentSchemaName,
      imports,
      recursiveContext: options.recursiveContext,
      resolvedSchemas: options.resolvedSchemas,
      skipDescription: true,
    });
    for (const imp of refResult.imports) {
      imports.add(imp);
    }
    return { code: refResult.code, imports };
  }

  /* Enumerable keys */
  if (propertyNames.enum && Array.isArray(propertyNames.enum)) {
    const literals = propertyNames.enum
      .filter((v): v is string => typeof v === "string")
      .map((v) => JSON.stringify(v));

    if (literals.length > 0) {
      return { code: `z.enum([${literals.join(", ")}])`, imports };
    }
  }

  /* Pattern-constrained keys */
  if (propertyNames.pattern) {
    const escapedPattern = propertyNames.pattern
      .replaceAll("\\", "\\\\")
      .replaceAll("/", "\\/");
    return { code: `z.string().regex(/${escapedPattern}/)`, imports };
  }

  return { code: "z.string()", imports };
}

/*
 * Build the full z.record(...) code for a schema that uses patternProperties
 * and/or propertyNames without named properties.
 */
export function generateRecordCode(config: {
  keyCode: string;
  valueCode: string;
}): string {
  const { keyCode, valueCode } = config;

  if (keyCode === "z.string()") {
    return `z.record(z.string(), ${valueCode})`;
  }

  return `z.record(${keyCode}, ${valueCode})`;
}

/*
 * Determine the key code from propertyNames when present, falling back to z.string().
 */
function generateKeyCode(
  propertyNames: ReferenceObject | SchemaObject | undefined,
  options: ZodSchemaCodeOptions,
  zodSchemaToCode: (
    schema: ReferenceObject | SchemaObject,
    options?: ZodSchemaCodeOptions,
  ) => ZodSchemaResult,
  imports: Set<string>,
): string {
  if (!propertyNames) {
    return "z.string()";
  }

  const keyResult = generatePropertyNamesKeyCode(
    propertyNames,
    zodSchemaToCode,
    { ...options, imports },
  );

  for (const imp of keyResult.imports) {
    imports.add(imp);
  }

  return keyResult.code;
}
