/* Shared utilities for Zod schema generation across client and server generators */

// Parameter schema generation exports
export type {
  ParameterSchemaResult,
  ParameterSchemaGenerationOptions,
} from "./parameter-schemas.js";

export {
  generateParameterSchemas,
  generateParameterSchema,
} from "./parameter-schemas.js";

// Request body mapping exports
export type {
  RequestBodyMapResult,
  RequestBodyMapOptions,
} from "./request-body-maps.js";

export {
  generateRequestBodyMap,
} from "./request-body-maps.js";

// Response mapping exports
export type {
  ResponseMapResult,
  ResponseMapOptions,
} from "./response-maps.js";

export {
  generateResponseMap,
} from "./response-maps.js";

// Common types and interfaces
export type {
  ContentTypeMapping,
  ParameterGroups,
} from "./types.js";