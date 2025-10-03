/**
 * Utility functions for parameter import detection and management
 */

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
 * Filters parameter imports that should be skipped for server generation
 */
export function filterServerParameterImports(
  parameterImports: StructuredParameterImport[],
): StructuredParameterImport[] {
  return parameterImports.filter((paramImport) => !paramImport.isSchema);
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
