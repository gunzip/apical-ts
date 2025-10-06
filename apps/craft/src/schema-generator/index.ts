// Advanced exports for custom usage
export type { ExtensibleEnumResult } from "./enum-handlers.js";

// Specialized handler exports
export { handleExtensibleEnum, handleRegularEnum } from "./enum-handlers.js";

export {
  generateRecursiveSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
  type SchemaFileResult,
} from "./file-generators.js";

export { handleObjectType } from "./object-types.js";

export {
  generateParameterSchemaFile,
  type ParameterSchemaFileResult,
  writeParameterSchemaFile,
} from "./parameter-file-generator.js";

export {
  handleArrayType,
  handleBooleanType,
  handleNumberType,
  handleStringType,
} from "./primitive-types.js";

export type { RecursiveContext } from "./recursive-handlers.js";

export {
  analyzeRecursiveReference,
  analyzeSchemaForRecursion,
  createRecursiveContext,
} from "./recursive-handlers.js";

export { handleReference } from "./reference-handlers.js";

// Main exports - commonly used functions and types
export {
  type OpenAPISchema,
  type ZodSchemaCodeOptions,
  type ZodSchemaResult,
  zodSchemaToCode,
} from "./schema-converter.js";

export type { DiscriminatorConfig, UnionType } from "./union-types.js";

export { handleAllOfSchema, handleUnionSchema } from "./union-types.js";

export type { EffectiveType } from "./utils.js";

// Utility exports
export {
  addDefaultValue,
  analyzeTypeArray,
  cloneWithoutNullable,
  inferEffectiveType,
  isNullable,
  mergeImports,
} from "./utils.js";
