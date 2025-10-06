/* Common types shared between client and server generators */

import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

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
 * Groups parameters by their location (query, path, header)
 * Re-exported from client generator for compatibility
 */
export type { ParameterGroups } from "../client-generator/models/parameter-models.js";
