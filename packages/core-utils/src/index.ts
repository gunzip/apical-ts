// Core converter exports
export {
  convertOpenAPI20to30,
  convertOpenAPI30to31,
  convertToOpenAPI31,
  isOpenAPI20,
  isOpenAPI30,
  isOpenAPI31,
} from "./core-generator/converter.js";
export {
  buildOperationFileContent,
  writeTypeScriptFile,
} from "./core-generator/file-writer.js";
export { ImportManager } from "./core-generator/import-types.js";
export { resolveResponseReference } from "./core-generator/openapi-utils.js";
export { createPackageJson } from "./core-generator/package-generator.js";
export { parseOpenAPI } from "./core-generator/parser.js";
export { Profiler } from "./core-generator/profiler.js";
export { resolveRequestBodies } from "./core-generator/request-body-resolver.js";

export {
  renameConflictingSchemas,
  renameSanitizationConflictingSchemas,
} from "./core-generator/schema-conflict-resolver.js";
export { generateSchemas } from "./core-generator/schema-generation-coordinator.js";

// Operation ID generation exports
export {
  applyGeneratedOperationIds,
  generateOperationId,
  generateUniqueOperationIds,
  getOrGenerateOperationId,
} from "./operation-id-generator/index.js";

export {
  generateGetterCode,
  generateRecursiveSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
  generateSchemaVariants,
  type SchemaVariantsResult,
} from "./schema-generator/file-generators.js";
export {
  determineObjectMethod,
  generateObjectCode,
  type ObjectPropertyOptions,
} from "./schema-generator/object-properties.js";
export { handleObjectType } from "./schema-generator/object-types.js";
export {
  analyzeRecursiveReference,
  createRecursiveContext,
  findReferencesInSchema,
} from "./schema-generator/recursive-handlers.js";
export { zodSchemaToCode } from "./schema-generator/schema-converter.js";
export type { ZodSchemaResult } from "./schema-generator/types.js";
// Schema generator exports
export { sanitizeIdentifier } from "./schema-generator/utils.js";

// Shared types and utilities
export {
  analyzeReadWriteProperties,
  ExtraPropsMode,
  SchemaContext,
} from "./shared/types.js";
