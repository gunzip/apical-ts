/* Shared schema type name resolution logic */

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import type { ContentTypeMapping } from "./types.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Resolves a schema to a TypeScript type name. Inline schemas get a synthetic
 * operation-scoped name; referenced schemas reuse their component name.
 *
 * This function is shared between client and server generators to ensure
 * consistent naming across the generated code.
 */
export function resolveSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const originalSchemaName = schema.$ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in schema");
    const typeName = sanitizeIdentifier(originalSchemaName as string);
    typeImports.add(typeName);
    return typeName;
  }
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
  typeImports.add(typeName);
  return typeName;
}

/**
 * Resolves a schema to a strict TypeScript type name for server usage.
 * Same as resolveSchemaTypeName but adds "Strict" suffix to component schemas.
 */
export function resolveStrictSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const originalSchemaName = schema.$ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in schema");
    const typeName = `${sanitizeIdentifier(originalSchemaName as string)}Strict`;
    typeImports.add(typeName);
    return typeName;
  }
  /* For inline schemas, generate strict versions with same naming */
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}Strict`;
  typeImports.add(typeName);
  return typeName;
}
