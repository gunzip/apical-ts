import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import { findReferencesInSchema } from "./recursive-handlers.js";
import { getSchemaNameFromReference } from "./schema-references.js";
import { analyzeTypeArray } from "./utils.js";

export function renderRecursiveTypeAlias(
  schema: SchemaObject,
  schemaName: string,
): string | undefined {
  return hasDirectSelfReference(schema, schemaName)
    ? renderSchemaType(schema)
    : undefined;
}

function hasDirectSelfReference(
  schema: SchemaObject,
  schemaName: string,
): boolean {
  return findReferencesInSchema(schema).some(
    (ref) => getSchemaNameFromReference(ref) === schemaName,
  );
}

function renderSchemaType(schema: ReferenceObject | SchemaObject): string {
  if (isReferenceObject(schema)) {
    return getSchemaNameFromReference(schema.$ref) ?? "unknown";
  }

  if (schema.enum?.length) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if ("const" in schema && schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  if (Array.isArray(schema.type)) {
    return renderMultiTypeSchema(schema);
  }

  const compositionType = renderCompositionType(schema);
  const baseType = compositionType ?? renderSimpleSchemaType(schema);
  const isNullable = hasNullableFlag(schema);

  return isNullable ? `${baseType} | null` : baseType;
}

function renderMultiTypeSchema(schema: SchemaObject): string {
  const schemaTypes = Array.isArray(schema.type) ? schema.type : [];
  const { isNullable, nonNullTypes } = analyzeTypeArray(schemaTypes);
  const baseTypes = [
    ...new Set(
      nonNullTypes.map((type) =>
        renderSchemaTypeForSpecificType(
          schema,
          type as Exclude<SchemaObject["type"], readonly string[] | undefined>,
        ),
      ),
    ),
  ];

  if (baseTypes.length === 0) {
    return "null";
  }

  const baseType = baseTypes.join(" | ");
  return isNullable || hasNullableFlag(schema)
    ? `${baseType} | null`
    : baseType;
}

function renderCompositionType(schema: SchemaObject): string | undefined {
  if (schema.allOf?.length) {
    return schema.allOf.map(renderSchemaType).join(" & ");
  }

  if (schema.anyOf?.length) {
    return schema.anyOf.map(renderSchemaType).join(" | ");
  }

  if (schema.oneOf?.length) {
    return schema.oneOf.map(renderSchemaType).join(" | ");
  }

  return undefined;
}

function renderSimpleSchemaType(schema: SchemaObject): string {
  if (schema.type === "array" || schema.items) {
    return `Array<${renderSchemaType(schema.items ?? {})}>`;
  }

  if (
    schema.type === "object" ||
    schema.properties ||
    schema.additionalProperties !== undefined
  ) {
    return renderObjectSchemaType(schema);
  }

  if (Array.isArray(schema.type)) {
    return schema.type.map(renderPrimitiveType).join(" | ");
  }

  if (schema.type) {
    return renderPrimitiveType(schema.type);
  }

  return "unknown";
}

function renderSchemaTypeForSpecificType(
  schema: SchemaObject,
  type: Exclude<SchemaObject["type"], readonly string[] | undefined>,
): string {
  switch (type) {
    case "array":
      return `Array<${renderSchemaType(schema.items ?? {})}>`;
    case "object":
      return renderObjectSchemaType(schema);
    default:
      return renderPrimitiveType(type);
  }
}

function renderObjectSchemaType(schema: SchemaObject): string {
  const requiredProperties = new Set(schema.required ?? []);
  const propertyEntries = Object.entries(schema.properties ?? {}).map(
    ([propertyName, propertySchema]) =>
      `${JSON.stringify(propertyName)}${requiredProperties.has(propertyName) ? "" : "?"}: ${renderSchemaType(propertySchema)}`,
  );
  const propertyType =
    propertyEntries.length > 0 ? `{ ${propertyEntries.join("; ")} }` : "{}";
  const additionalPropertiesType = renderAdditionalPropertiesType(
    schema.additionalProperties,
  );

  if (!additionalPropertiesType) {
    return propertyType;
  }

  return propertyEntries.length > 0
    ? `${propertyType} & ${additionalPropertiesType}`
    : additionalPropertiesType;
}

function renderAdditionalPropertiesType(
  additionalProperties: SchemaObject["additionalProperties"],
): string | undefined {
  if (additionalProperties === undefined || additionalProperties === false) {
    return undefined;
  }

  if (additionalProperties === true) {
    return "{ [key: string]: unknown }";
  }

  return `{ [key: string]: ${renderSchemaType(additionalProperties)} }`;
}

function renderPrimitiveType(
  type: Exclude<SchemaObject["type"], readonly string[] | undefined>,
): string {
  switch (type) {
    case "boolean":
      return "boolean";
    case "integer":
    case "number":
      return "number";
    case "null":
      return "null";
    case "string":
      return "string";
    default:
      return "unknown";
  }
}

function hasNullableFlag(schema: SchemaObject): boolean {
  return "nullable" in schema && schema.nullable === true;
}
