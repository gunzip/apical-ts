import type { OpenAPIObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";
import type { RecursiveContext } from "./recursive-handlers.js";

/**
 * Type for resolved schemas from OpenAPI components
 */
export type ResolvedSchemas = NonNullable<
  OpenAPIObject["components"]
>["schemas"];

export type GeneratedSchemaHelper = "exclusiveUnion";

/**
 * Options for zodSchemaToCode function
 *
 * These options control how OpenAPI schemas are converted to Zod validation schemas.
 */
export interface ZodSchemaCodeOptions {
  /**
   * Override registry for OpenAPI string formats
   */
  formatOverrides?: StringFormatOverrideRegistry;
  /**
   * Name of the schema being converted (used for recursive detection and naming)
   */
  currentSchemaName?: string;
  /**
   * How to handle extra properties in objects (strip, passthrough, or strict)
   */
  extraProps?: ExtraPropsMode;
  /**
   * Set of schema names that need to be imported
   */
  imports?: Set<string>;
  /**
   * Set of generated helper utilities required by the emitted schema code.
   */
  helpers?: Set<GeneratedSchemaHelper>;
  /**
   * Whether this is a top-level schema (affects naming and export generation)
   */
  isTopLevel?: boolean;
  /**
   * Context for detecting and handling recursive schema references
   */
  recursiveContext?: RecursiveContext;
  /**
   * Map of resolved schema definitions from OpenAPI components
   */
  resolvedSchemas?: ResolvedSchemas;
  /**
   * Additional context about the schema (operation, request/response, etc.)
   */
  schemaContext?: SchemaContext;
  /**
   * Whether to skip adding the description to the Zod code (used for recursion)
   */
  skipDescription?: boolean;
}

/**
 * Result of converting an OpenAPI schema to Zod code
 *
 * @example
 * ```typescript
 * const result: ZodSchemaResult = {
 *   code: "z.object({ name: z.string(), age: z.number().optional() })",
 *   imports: new Set(['UserType', 'AddressSchema'])
 * };
 * ```
 */
export interface ZodSchemaResult {
  /**
   * Generated Zod validation code as a string
   */
  code: string;
  /**
   * If this is an extensible enum, the array of valid enum values
   */
  extensibleEnumValues?: unknown[];
  /**
   * Set of dependency identifiers that need to be imported for this code to work.
   * This includes generated schema names and reserved aliases for string-format
   * overrides.
   */
  imports: Set<string>;
  /**
   * Set of generated helper utilities required by the emitted schema code.
   */
  helpers: Set<GeneratedSchemaHelper>;
}
