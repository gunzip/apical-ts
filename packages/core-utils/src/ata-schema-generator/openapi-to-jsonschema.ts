/*
 * Converts OpenAPI SchemaObject to clean JSON Schema 2020-12.
 *
 * OpenAPI 3.1 uses JSON Schema 2020-12 but adds a few OpenAPI-specific
 * keywords that ata-validator (pure JSON Schema) does not understand.
 * This module strips or transforms those keywords while preserving
 * validation semantics.
 */

import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isSchemaObject } from "openapi3-ts/oas31";

import type { ExtraPropsMode, SchemaContext } from "../shared/types.js";

/* OpenAPI-specific keywords that have no JSON Schema equivalent */
const OPENAPI_ONLY_KEYWORDS = new Set([
  "deprecated",
  "discriminator",
  "example",
  "examples",
  "externalDocs",
  "xml",
]);

/* OpenAPI string formats that are not standard JSON Schema formats */
const OPENAPI_NUMERIC_FORMATS = new Set(["double", "float", "int32", "int64"]);

interface NormalizationOptions {
  extraProps?: ExtraPropsMode;
  resolvedSchemas?: Record<string, unknown>;
  schemaContext?: SchemaContext;
}

/*
 * Converts an OpenAPI SchemaObject to a clean JSON Schema 2020-12 object
 * suitable for consumption by ata-validator.
 */
export function openApiSchemaToJsonSchema(
  schema: ReferenceObject | SchemaObject,
  options: NormalizationOptions = {},
): Record<string, unknown> {
  if (!isSchemaObject(schema)) {
    // $ref object — pass through as-is (ata resolves $ref internally)
    return schema as unknown as Record<string, unknown>;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (OPENAPI_ONLY_KEYWORDS.has(key)) {
      continue;
    }

    // Skip readOnly/writeOnly from output (they are OAS metadata, not validation)
    if (key === "readOnly" || key === "writeOnly") {
      continue;
    }

    switch (key) {
      case "properties":
        result.properties = normalizeProperties(
          value as Record<string, ReferenceObject | SchemaObject>,
          options,
        );
        break;

      case "items":
        result.items = openApiSchemaToJsonSchema(
          value as ReferenceObject | SchemaObject,
          options,
        );
        break;

      case "additionalProperties":
        if (typeof value === "boolean") {
          result.additionalProperties = value;
        } else if (value) {
          result.additionalProperties = openApiSchemaToJsonSchema(
            value as ReferenceObject | SchemaObject,
            options,
          );
        }
        break;

      case "allOf":
      case "anyOf":
      case "oneOf":
        result[key] = (value as (ReferenceObject | SchemaObject)[]).map((s) =>
          openApiSchemaToJsonSchema(s, options),
        );
        break;

      case "not":
        result.not = openApiSchemaToJsonSchema(
          value as ReferenceObject | SchemaObject,
          options,
        );
        break;

      case "prefixItems":
        result.prefixItems = (value as (ReferenceObject | SchemaObject)[]).map(
          (s) => openApiSchemaToJsonSchema(s, options),
        );
        break;

      case "format":
        // Strip OpenAPI numeric formats (they don't map to JSON Schema formats)
        if (!OPENAPI_NUMERIC_FORMATS.has(value as string)) {
          result.format = value;
        }
        break;

      case "$ref":
        result.$ref = normalizeRefPointer(value as string);
        break;

      default:
        result[key] = value;
        break;
    }
  }

  // Apply additionalProperties behavior based on extraProps mode
  applyExtraPropsMode(result, options.extraProps);

  // Handle discriminator → inject const into oneOf variants
  if (schema.discriminator && schema.oneOf) {
    injectDiscriminatorConst(result, schema.discriminator);
  }

  // Filter properties based on schema context (request/response)
  if (options.schemaContext && result.properties) {
    filterPropertiesByContext(
      result,
      schema as SchemaObject,
      options.schemaContext,
    );
  }

  return result;
}

/*
 * Normalizes a $ref pointer from OpenAPI format to JSON Schema format.
 * OpenAPI uses #/components/schemas/Foo, JSON Schema uses #/$defs/Foo
 * However, ata-validator can resolve both formats when schemas are provided
 * via the `schemas` option, so we keep the component path format and
 * register schemas separately.
 */
function normalizeRefPointer(ref: string): string {
  return ref;
}

function normalizeProperties(
  properties: Record<string, ReferenceObject | SchemaObject>,
  options: NormalizationOptions,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    result[key] = openApiSchemaToJsonSchema(value, options);
  }
  return result;
}

function applyExtraPropsMode(
  schema: Record<string, unknown>,
  extraProps?: ExtraPropsMode,
): void {
  // Only apply to object schemas that don't already specify additionalProperties
  if (schema.type !== "object" || schema.additionalProperties !== undefined) {
    return;
  }

  switch (extraProps) {
    case "strict":
      schema.additionalProperties = false;
      break;
    case "strip":
      // ata-validator's removeAdditional option handles stripping at runtime
      // For AOT, we set additionalProperties: false to reject extra props
      schema.additionalProperties = false;
      break;
    case "loose":
      // Allow anything — JSON Schema default (additionalProperties: true)
      break;
  }
}

/*
 * When a discriminator is present, injects a `const` constraint for the
 * discriminator property into each oneOf variant schema. This allows
 * ata-validator to perform efficient variant matching without understanding
 * the OpenAPI discriminator keyword.
 */
function injectDiscriminatorConst(
  schema: Record<string, unknown>,
  discriminator: { mapping?: Record<string, string>; propertyName: string },
): void {
  const variants = schema.oneOf as Record<string, unknown>[] | undefined;
  if (!variants) return;

  const { mapping, propertyName } = discriminator;

  if (mapping) {
    // Use explicit mapping to inject const values
    const refToValue = new Map<string, string>();
    for (const [value, ref] of Object.entries(mapping)) {
      refToValue.set(ref, value);
    }

    for (const variant of variants) {
      const ref = variant.$ref as string | undefined;
      if (ref && refToValue.has(ref)) {
        // Cannot inject const into a $ref — wrap in allOf
        const idx = variants.indexOf(variant);
        variants[idx] = {
          allOf: [
            variant,
            {
              properties: {
                [propertyName]: { const: refToValue.get(ref) },
              },
              required: [propertyName],
            },
          ],
        };
      }
    }
  } else {
    // Infer const values from each variant's property definition
    for (const variant of variants) {
      const properties = variant.properties as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (properties?.[propertyName]?.enum) {
        const enumValues = properties[propertyName].enum as unknown[];
        if (enumValues.length === 1) {
          properties[propertyName] = { const: enumValues[0] };
        }
      }
    }
  }
}

/*
 * Filters properties based on schema context:
 * - request: exclude readOnly properties
 * - response: exclude writeOnly properties
 */
function filterPropertiesByContext(
  result: Record<string, unknown>,
  originalSchema: SchemaObject,
  context: SchemaContext,
): void {
  if (context === "base" || !originalSchema.properties) return;

  const properties = result.properties as Record<string, unknown>;
  const required = result.required as string[] | undefined;
  const removedKeys: string[] = [];

  for (const [key, propSchema] of Object.entries(originalSchema.properties)) {
    if (!isSchemaObject(propSchema)) continue;

    if (context === "request" && propSchema.readOnly === true) {
      removedKeys.push(key);
    } else if (context === "response" && propSchema.writeOnly === true) {
      removedKeys.push(key);
    }
  }

  for (const key of removedKeys) {
    delete properties[key];
  }

  // Also remove from required array
  if (required && removedKeys.length > 0) {
    result.required = required.filter((k) => !removedKeys.includes(k));
    if ((result.required as string[]).length === 0) {
      delete result.required;
    }
  }
}

/*
 * Builds a complete JSON Schema document with $defs for all component schemas.
 * This is needed for cross-schema $ref resolution within ata-validator.
 */
export function buildSchemaRegistry(
  resolvedSchemas: Record<string, unknown>,
  options: NormalizationOptions = {},
): Record<string, Record<string, unknown>> {
  const registry: Record<string, Record<string, unknown>> = {};

  for (const [name, schema] of Object.entries(resolvedSchemas)) {
    if (isSchemaObject(schema as ReferenceObject | SchemaObject)) {
      const normalized = openApiSchemaToJsonSchema(
        schema as SchemaObject,
        options,
      );
      // Assign $id so ata-validator can resolve cross-schema $ref
      normalized.$id = `#/components/schemas/${name}`;
      registry[name] = normalized;
    }
  }

  return registry;
}
