import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject, isSchemaObject } from "openapi3-ts/oas31";

import type { StringFormatOverrideRegistry } from "./format-overrides.js";
import type { GeneratedSchemaHelper } from "./types.js";

import { findStringFormatOverride } from "./format-overrides.js";
import { renderSchemaType } from "./recursive-type-renderer.js";
import { parseSchemaReference } from "./schema-references.js";
import { analyzeTypeArray } from "./utils.js";

const MAX_INLINE_PROPERTIES = 40;
const MAX_INLINE_TYPE_DEPTH = 5;
const MIN_SCHEMAS_FOR_INLINE_TYPES = 100;

interface InlineTypeAnalysis {
  hasComplexComposition: boolean;
  hasDefaults: boolean;
  hasExternalReferences: boolean;
  hasFormatOverrides: boolean;
  hasUnsupportedKeywords: boolean;
  hasUnsupportedLiterals: boolean;
  hasUnsupportedRuntimeTypes: boolean;
  maxDepth: number;
  propertyCount: number;
}

export interface InlineTypeRenderOptions {
  formatOverrides?: StringFormatOverrideRegistry;
  helpers?: ReadonlySet<GeneratedSchemaHelper>;
  isRecursive?: boolean;
  totalGeneratedSchemaCount?: number;
}

interface ShouldInlineTypesInput extends InlineTypeRenderOptions {
  kind?: "fallback" | "schema";
  schema?: ReferenceObject | SchemaObject;
}

/*
 * Keep explicit aliases for large outputs where repeated z.infer expansion is
 * most expensive, but stay conservative on individual schema complexity.
 */
export function shouldInlineTypes(input: ShouldInlineTypesInput): boolean {
  const {
    helpers,
    isRecursive = false,
    kind = "schema",
    schema,
    totalGeneratedSchemaCount = 0,
  } = input;

  if (totalGeneratedSchemaCount < MIN_SCHEMAS_FOR_INLINE_TYPES) {
    return false;
  }

  if (kind === "fallback") {
    return true;
  }

  if (!schema || isRecursive || (helpers && helpers.size > 0)) {
    return false;
  }

  const analysis = analyzeSchemaForInlineTypes(
    schema,
    input.formatOverrides,
    1,
  );

  return (
    !analysis.hasComplexComposition &&
    !analysis.hasDefaults &&
    !analysis.hasExternalReferences &&
    !analysis.hasFormatOverrides &&
    !analysis.hasUnsupportedKeywords &&
    !analysis.hasUnsupportedLiterals &&
    !analysis.hasUnsupportedRuntimeTypes &&
    analysis.maxDepth <= MAX_INLINE_TYPE_DEPTH &&
    analysis.propertyCount <= MAX_INLINE_PROPERTIES
  );
}

export function tryRenderInlineTypeAlias(
  name: string,
  schema: ReferenceObject | SchemaObject,
  options: InlineTypeRenderOptions = {},
): string | undefined {
  if (!shouldInlineTypes({ ...options, schema })) {
    return undefined;
  }

  return `export type ${name} = ${renderSchemaType(schema)};`;
}

export function tryRenderFallbackTypeAlias(
  name: string,
  schema: unknown,
  options: Pick<InlineTypeRenderOptions, "totalGeneratedSchemaCount"> = {},
): string | undefined {
  if (!shouldInlineTypes({ ...options, kind: "fallback" })) {
    return undefined;
  }

  if (schema === false) {
    return `export type ${name} = never;`;
  }

  if (schema === true) {
    return `export type ${name} = unknown;`;
  }

  return undefined;
}

function analyzeSchemaForInlineTypes(
  schema: ReferenceObject | SchemaObject,
  formatOverrides: StringFormatOverrideRegistry | undefined,
  depth: number,
): InlineTypeAnalysis {
  const analysis = createInlineTypeAnalysis(depth);

  if (depth > MAX_INLINE_TYPE_DEPTH) {
    analysis.maxDepth = depth;
    return analysis;
  }

  if (isReferenceObject(schema)) {
    if (!parseSchemaReference(schema.$ref)) {
      analysis.hasExternalReferences = true;
    }
    return analysis;
  }

  if (!isSchemaObject(schema)) {
    analysis.hasUnsupportedKeywords = true;
    return analysis;
  }

  if (
    schema.allOf?.length ||
    schema.anyOf?.length ||
    schema.oneOf?.length ||
    schema.discriminator
  ) {
    analysis.hasComplexComposition = true;
  }

  if (
    schema.default !== undefined ||
    schema.not !== undefined ||
    ("patternProperties" in schema && schema.patternProperties !== undefined) ||
    schema.propertyNames !== undefined ||
    schema["x-extensible-enum"] !== undefined
  ) {
    analysis.hasDefaults ||= schema.default !== undefined;
    analysis.hasUnsupportedKeywords ||= Boolean(
      schema.not !== undefined ||
      ("patternProperties" in schema &&
        schema.patternProperties !== undefined) ||
      schema.propertyNames !== undefined ||
      schema["x-extensible-enum"] !== undefined,
    );
  }

  if (
    (schema.type === "integer" && schema.format === "int64") ||
    schema.format === "binary"
  ) {
    analysis.hasUnsupportedRuntimeTypes = true;
  }

  if (findStringFormatOverride(schema.format, formatOverrides)) {
    analysis.hasFormatOverrides = true;
  }

  if (schema.const !== undefined && !isInlineLiteralSupported(schema.const)) {
    analysis.hasUnsupportedLiterals = true;
  }

  if (
    schema.enum?.some((value: unknown) => !isInlineLiteralSupported(value)) ===
    true
  ) {
    analysis.hasUnsupportedLiterals = true;
  }

  if (Array.isArray(schema.type)) {
    const { nonNullTypes } = analyzeTypeArray(schema.type);
    if (nonNullTypes.length > 1) {
      analysis.hasComplexComposition = true;
    }
  }

  if (
    schema.additionalProperties !== undefined &&
    schema.additionalProperties !== false &&
    schema.additionalProperties !== true
  ) {
    analysis.hasUnsupportedKeywords = true;
  }

  if (schema.items) {
    mergeInlineTypeAnalysis(
      analysis,
      analyzeSchemaForInlineTypes(schema.items, formatOverrides, depth + 1),
    );
  }

  if (schema.properties) {
    analysis.propertyCount += Object.keys(schema.properties).length;
    for (const propertySchema of Object.values(schema.properties)) {
      mergeInlineTypeAnalysis(
        analysis,
        analyzeSchemaForInlineTypes(propertySchema, formatOverrides, depth + 1),
      );
    }
  }

  return analysis;
}

function createInlineTypeAnalysis(depth: number): InlineTypeAnalysis {
  return {
    hasComplexComposition: false,
    hasDefaults: false,
    hasExternalReferences: false,
    hasFormatOverrides: false,
    hasUnsupportedKeywords: false,
    hasUnsupportedLiterals: false,
    hasUnsupportedRuntimeTypes: false,
    maxDepth: depth,
    propertyCount: 0,
  };
}

function mergeInlineTypeAnalysis(
  target: InlineTypeAnalysis,
  source: InlineTypeAnalysis,
): void {
  target.hasComplexComposition ||= source.hasComplexComposition;
  target.hasDefaults ||= source.hasDefaults;
  target.hasExternalReferences ||= source.hasExternalReferences;
  target.hasFormatOverrides ||= source.hasFormatOverrides;
  target.hasUnsupportedKeywords ||= source.hasUnsupportedKeywords;
  target.hasUnsupportedLiterals ||= source.hasUnsupportedLiterals;
  target.hasUnsupportedRuntimeTypes ||= source.hasUnsupportedRuntimeTypes;
  target.maxDepth = Math.max(target.maxDepth, source.maxDepth);
  target.propertyCount += source.propertyCount;
}

function isInlineLiteralSupported(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}
