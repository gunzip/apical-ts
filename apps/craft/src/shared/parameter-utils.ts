/**
 * Utility functions for parameter import detection and management
 */

import type { ImportManager } from "../core-generator/import-types.js";

/**
 * Import categorization for file writers
 */
export interface CategorizedImports {
  readonly parameterImports: StructuredParameterImport[];
  readonly regularImports: string[];
  readonly zodImport: boolean;
}

export type ParameterType = "Headers" | "Path" | "Query";

/**
 * Structured parameter import info with type information
 */
export interface StructuredParameterImport {
  readonly importName: string;
  readonly isSchema: boolean;
  readonly operationId: string;
  readonly parameterType: ParameterType;
}

/**
 * Categorizes imports from ImportManager without pattern matching
 */
export function categorizeImportsFromManager(
  importManager: ImportManager,
): CategorizedImports {
  const parameterImports: StructuredParameterImport[] = [];
  const regularImports: string[] = [];
  const zodImport = importManager.hasZodImport();

  // Get parameter imports directly from manager
  const parameterImportInfos = importManager.getParameterImports();
  for (const importInfo of parameterImportInfos) {
    if (importInfo.operationId && importInfo.parameterType) {
      parameterImports.push({
        importName: importInfo.name,
        isSchema: importInfo.isSchema ?? false,
        operationId: importInfo.operationId,
        parameterType: importInfo.parameterType,
      });
    }
  }

  // Get regular schema imports
  const schemaImports = importManager.getSchemaImports();
  for (const importInfo of schemaImports) {
    regularImports.push(importInfo.name);
  }

  return {
    parameterImports,
    regularImports,
    zodImport,
  };
}

/**
 * Filters parameter imports that should be skipped for server generation using ImportManager
 */
export function filterServerParameterImportsFromManager(
  importManager: ImportManager,
): StructuredParameterImport[] {
  const parameterImports = importManager.getParameterImportsForServer();
  return parameterImports
    .filter(
      (
        importInfo,
      ): importInfo is Required<
        Pick<typeof importInfo, "operationId" | "parameterType">
      > &
        typeof importInfo =>
        importInfo.operationId !== undefined &&
        importInfo.parameterType !== undefined,
    )
    .map((importInfo) => ({
      importName: importInfo.name,
      isSchema: importInfo.isSchema ?? false,
      operationId: importInfo.operationId,
      parameterType: importInfo.parameterType,
    }));
}
