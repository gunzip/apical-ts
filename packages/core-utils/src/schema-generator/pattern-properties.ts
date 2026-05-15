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
  refinement?: string;
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
 *
 * Single pattern: uses z.string().regex(...) as key and the value schema directly.
 * Multiple patterns: uses z.string() as key with z.union([...]) as value and
 * appends a .superRefine() that validates each key against the correct pattern
 * and its corresponding value schema at runtime.
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

  /*
   * Single pattern: validate the key with a regex and use the value schema directly.
   */
  if (entries.length === 1) {
    const [pattern] = entries;
    const keyCode = `z.string().regex(/${escapeRegexForLiteral(pattern[0])}/)`;
    return { imports, keyCode, valueCode: valueResults[0].code };
  }

  /*
   * Multiple patterns: use a union for the value type and add a superRefine
   * that validates each key against its matching pattern's value schema.
   */
  const valueCode = `z.union([${valueResults.map((r) => r.code).join(", ")}])`;
  const refinement = generateSuperRefine(entries, valueResults);

  return { imports, keyCode: "z.string()", refinement, valueCode };
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
    const escapedPattern = escapeRegexForLiteral(propertyNames.pattern);
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
  refinement?: string;
  valueCode: string;
}): string {
  const { keyCode, refinement, valueCode } = config;
  const base = `z.record(${keyCode}, ${valueCode})`;

  if (refinement) {
    return `${base}.superRefine(${refinement})`;
  }

  return base;
}

/*
 * Generate a superRefine callback that validates each entry against the
 * matching pattern's value schema at runtime.
 *
 * Output example:
 *   (val, ctx) => { for (const [key, value] of Object.entries(val)) {
 *     if (/^S_/.test(key) && !z.string().safeParse(value).success) {
 *       ctx.addIssue({ code: "custom", path: [key], message: "..." });
 *     }
 *     if (/^N_/.test(key) && !z.number().int().safeParse(value).success) {
 *       ctx.addIssue({ code: "custom", path: [key], message: "..." });
 *     }
 *   }}
 */
function generateSuperRefine(
  entries: [string, ReferenceObject | SchemaObject][],
  valueResults: ZodSchemaResult[],
): string {
  const checks = entries.map(([pattern], index) => {
    const escapedPattern = escapeRegexForLiteral(pattern);
    const valueSchema = valueResults[index].code;
    return (
      `if (/${escapedPattern}/.test(key) && !${valueSchema}.safeParse(value).success) ` +
      `{ ctx.addIssue({ code: "custom", path: [key], message: "Value at key \\"" + key + "\\" does not match schema for pattern ${escapedPattern}" }); }`
    );
  });

  return `(val, ctx) => { for (const [key, value] of Object.entries(val)) { ${checks.join(" ")} } }`;
}

/*
 * Escape a regex pattern for embedding in a JavaScript regex literal (/.../):
 * - Forward slashes must be escaped so the regex literal doesn't terminate early
 */
function escapeRegexForLiteral(pattern: string): string {
  return pattern.replaceAll("/", "\\/");
}
