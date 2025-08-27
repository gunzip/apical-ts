/* Shared utilities for Zod schema generation across client and server generators */

// Parameter schema generation exports
export type {
  ParameterSchemaGenerationOptions,
  ParameterSchemaResult,
} from "./parameter-schemas.js";

export {
  generateParameterSchema,
  generateParameterSchemas,
} from "./parameter-schemas.js";

// Request body mapping exports
export type {
  RequestBodyMapOptions,
  RequestBodyMapResult,
} from "./request-body-maps.js";

export { generateRequestBodyMap } from "./request-body-maps.js";

// Response mapping exports
export type { ResponseMapOptions, ResponseMapResult } from "./response-maps.js";

export { generateResponseMap } from "./response-maps.js";

// Common types and interfaces
export type { ContentTypeMapping, ParameterGroups } from "./types.js";
