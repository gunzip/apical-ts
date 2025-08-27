/* Common types shared between client and server generators */

import type { ParameterObject, SchemaObject, ReferenceObject } from "openapi3-ts/oas31";

/**
 * Represents a content type mapping for requests/responses
 */
export interface ContentTypeMapping {
  contentType: string;
  schema: SchemaObject | ReferenceObject;
}

/**
 * Groups parameters by their location (query, path, header)
 * Re-exported from client generator for compatibility
 */
export type { ParameterGroups } from "../client-generator/models/parameter-models.js";