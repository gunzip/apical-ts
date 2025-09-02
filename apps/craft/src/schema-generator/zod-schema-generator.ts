export type { ExtensibleEnumResult } from "./enum-handlers.js";

// Re-export specialized handlers for custom usage
export { handleExtensibleEnum, handleRegularEnum } from "./enum-handlers.js";

export type { SchemaFileResult } from "./file-generators.js";

// Re-export file generation functions
export {
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
} from "./file-generators.js";

export { handleObjectType } from "./object-types.js";

export {
  handleArrayType,
  handleBooleanType,
  handleNumberType,
  handleStringType,
} from "./primitive-types.js";

export { handleReference } from "./reference-handlers.js";

// Re-export types
export type {
  OpenAPISchema,
  ZodSchemaCodeOptions,
  ZodSchemaResult,
} from "./schema-converter.js";

// Re-export main conversion function
export { zodSchemaToCode } from "./schema-converter.js";

export type { DiscriminatorConfig, UnionType } from "./union-types.js";

export { handleAllOfSchema, handleUnionSchema } from "./union-types.js";

export type { EffectiveType } from "./utils.js";

// Re-export utility functions for advanced usage
export {
  addDefaultValue,
  analyzeTypeArray,
  cloneWithoutNullable,
  inferEffectiveType,
  isNullable,
  mergeImports,
} from "./utils.js";
