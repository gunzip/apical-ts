/* Common types shared between client and server generators */

import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isSchemaObject } from "openapi3-ts/oas31";

/**
 * Represents a content type mapping for requests/responses
 */
export interface ContentTypeMapping {
  contentType: string;
  schema: ReferenceObject | SchemaObject;
}

/**
 * Represents how Zod schemas handle extra properties in objects
 * - "loose": Allows extra properties (.passthrough())
 * - "strict": Disallows extra properties (.strict())
 * - "strip": Removes extra properties (default Zod behavior)
 */
export type ExtraPropsMode = "loose" | "strict" | "strip";

/**
 * Result of analyzing a schema for readOnly/writeOnly properties
 */
export interface ReadWriteAnalysis {
  hasReadOnly: boolean;
  hasWriteOnly: boolean;
  readOnlyKeys: string[];
  writeOnlyKeys: string[];
}

/**
 * Represents the context in which a schema is being generated:
 * - "base": Generate the complete schema with all properties
 * - "request": Generate for request bodies (exclude readOnly properties)
 * - "response": Generate for responses (exclude writeOnly properties)
 */
export type SchemaContext = "base" | "request" | "response";

/**
 * Analyzes an object schema to detect readOnly and writeOnly properties
 */
export function analyzeReadWriteProperties(
  schema: ReferenceObject | SchemaObject,
): ReadWriteAnalysis {
  const result: ReadWriteAnalysis = {
    hasReadOnly: false,
    hasWriteOnly: false,
    readOnlyKeys: [],
    writeOnlyKeys: [],
  };

  if (!isSchemaObject(schema) || !schema.properties) {
    return result;
  }

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!isSchemaObject(propSchema)) {
      continue;
    }

    if (propSchema.readOnly === true) {
      result.hasReadOnly = true;
      result.readOnlyKeys.push(key);
    }

    if (propSchema.writeOnly === true) {
      result.hasWriteOnly = true;
      result.writeOnlyKeys.push(key);
    }
  }

  return result;
}

/**
 * Checks if a property should be included based on schema context
 * - In request context: exclude readOnly properties
 * - In response context: exclude writeOnly properties
 * - In base context: include all properties
 */
export function shouldIncludeProperty(
  propSchema: ReferenceObject | SchemaObject,
  context: SchemaContext,
): boolean {
  if (!isSchemaObject(propSchema)) {
    return true;
  }

  if (context === "request" && propSchema.readOnly === true) {
    return false;
  }

  if (context === "response" && propSchema.writeOnly === true) {
    return false;
  }

  return true;
}

/**
 * Groups parameters by their location (query, path, header)
 * Re-exported from client generator for compatibility
 */
export type { ParameterGroups } from "../client-generator/models/parameter-models.js";
