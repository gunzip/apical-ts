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
 * Parameter suffixes patterns
 */
export const PARAMETER_SUFFIXES = {
  HEADERS: "Headers",
  HEADERS_SCHEMA: "HeadersSchema",
  PATH: "Path",
  PATH_SCHEMA: "PathSchema",
  QUERY: "Query",
  QUERY_SCHEMA: "QuerySchema",
} as const;

/**
 * Categorizes imports into structured groups with required operation ID
 * @deprecated Use categorizeImportsFromManager for new code
 */
export function categorizeImports(
  imports: Set<string>,
  operationId: string,
): CategorizedImports {
  const parameterImports: StructuredParameterImport[] = [];
  const regularImports: string[] = [];
  let zodImport = false;

  for (const importName of imports) {
    if (importName === "z") {
      zodImport = true;
      continue;
    }

    // Check if it's a parameter import using pattern matching
    let isParameter = false;

    // Check for schema types first (longer suffixes)
    for (const [type, suffix] of [
      ["Query", PARAMETER_SUFFIXES.QUERY_SCHEMA] as const,
      ["Path", PARAMETER_SUFFIXES.PATH_SCHEMA] as const,
      ["Headers", PARAMETER_SUFFIXES.HEADERS_SCHEMA] as const,
    ]) {
      if (importName.endsWith(suffix)) {
        // Use the provided operation ID
        parameterImports.push({
          importName,
          isSchema: true,
          operationId,
          parameterType: type,
        });
        isParameter = true;
        break;
      }
    }

    // Check for non-schema types if not already found
    if (!isParameter) {
      for (const [type, suffix] of [
        ["Query", PARAMETER_SUFFIXES.QUERY] as const,
        ["Path", PARAMETER_SUFFIXES.PATH] as const,
        ["Headers", PARAMETER_SUFFIXES.HEADERS] as const,
      ]) {
        if (importName.endsWith(suffix)) {
          // Use the provided operation ID
          parameterImports.push({
            importName,
            isSchema: false,
            operationId,
            parameterType: type,
          });
          isParameter = true;
          break;
        }
      }
    }

    // If not a parameter import, add to regular imports
    if (!isParameter) {
      regularImports.push(importName);
    }
  }

  return {
    parameterImports,
    regularImports,
    zodImport,
  };
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
 * Filters parameter imports that should be skipped for server generation
 */
export function filterServerParameterImports(
  parameterImports: StructuredParameterImport[],
): StructuredParameterImport[] {
  return parameterImports.filter((paramImport) => !paramImport.isSchema);
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

/**
 * Groups structured parameter imports by operation ID
 */
export function groupStructuredParameterImports(
  parameterImports: StructuredParameterImport[],
): Map<string, StructuredParameterImport[]> {
  const groups = new Map<string, StructuredParameterImport[]>();

  for (const paramImport of parameterImports) {
    if (!groups.has(paramImport.operationId)) {
      groups.set(paramImport.operationId, []);
    }
    const group = groups.get(paramImport.operationId);
    if (group) {
      group.push(paramImport);
    }
  }

  return groups;
}
