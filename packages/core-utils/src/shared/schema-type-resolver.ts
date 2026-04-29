/* Shared schema type name resolution logic */

import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject, isSchemaObject } from "openapi3-ts/oas31";

import type { ContentTypeMapping } from "./types.js";

import { parseSchemaReference } from "../schema-generator/schema-references.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { analyzeReadWriteProperties } from "./types.js";

/**
 * Context for schema type resolution
 */
export type SchemaResolverContext = "request" | "response";

/**
 * Resolves a schema to a TypeScript type name. Inline schemas get a synthetic
 * operation-scoped name; referenced schemas reuse their component name.
 *
 * This function is shared between client and server generators to ensure
 * consistent naming across the generated code.
 *
 * When context is "request" and the schema has readOnly properties, uses the Request variant.
 * When context is "response" and the schema has writeOnly properties, uses the Response variant.
 */
export function resolveSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
  context?: SchemaResolverContext,
  resolvedSchemas?: Record<string, ReferenceObject | SchemaObject>,
): string {
  if (isReferenceObject(schema)) {
    const schemaReference = parseSchemaReference(schema.$ref);
    assert(schemaReference, "Invalid $ref in schema");
    const { identifierName: baseName, originalName } = schemaReference;

    /* Check for readOnly/writeOnly variants when context and resolved schemas are provided */
    if (context && resolvedSchemas) {
      const referencedSchema = resolvedSchemas[originalName];
      if (referencedSchema && isSchemaObject(referencedSchema)) {
        const analysis = analyzeReadWriteProperties(referencedSchema);

        /* For request context, use Request variant if schema has readOnly properties */
        if (context === "request" && analysis.hasReadOnly) {
          const requestVariant = `${baseName}Request`;
          typeImports.add(requestVariant);
          return requestVariant;
        }

        /* For response context, use Response variant if schema has writeOnly properties */
        if (context === "response" && analysis.hasWriteOnly) {
          const responseVariant = `${baseName}Response`;
          typeImports.add(responseVariant);
          return responseVariant;
        }
      }
    }

    typeImports.add(baseName);
    return baseName;
  }
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
  typeImports.add(typeName);
  return typeName;
}
