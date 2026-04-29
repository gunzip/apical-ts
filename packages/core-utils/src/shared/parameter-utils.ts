/**
 * Utility functions for parameter import detection and management
 */

import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { assert } from "console";
import { isReferenceObject } from "openapi3-ts/oas31";

import type { ImportManager } from "../core-generator/import-types.js";
import type { ParameterGroups } from "./models/parameter-models.js";

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
 * Extracts and groups parameters from operation and path-level definitions
 */
export function extractParameterGroups(
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject,
): ParameterGroups {
  /* Resolve parameter references and combine path-level and operation-level parameters */
  const resolvedPathLevelParams = pathLevelParameters.map((p) =>
    resolveParameterReference(p, doc),
  );
  const resolvedOperationParams = (operation.parameters || []).map((p) =>
    resolveParameterReference(p, doc),
  );
  /* Deduplicate by name+location: operation-level params override path-level per OpenAPI spec */
  const parameterMap = new Map<string, ParameterObject>();
  for (const p of resolvedPathLevelParams) {
    parameterMap.set(`${p.in}:${p.name}`, p);
  }
  for (const p of resolvedOperationParams) {
    parameterMap.set(`${p.in}:${p.name}`, p);
  }
  const allParameters = [...parameterMap.values()];

  return {
    headerParams: allParameters.filter((p) => p.in === "header"),
    pathParams: allParameters.filter((p) => p.in === "path"),
    queryParams: allParameters.filter((p) => p.in === "query"),
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

/**
 * Resolves parameter references to actual parameter objects
 */
export function resolveParameterReference(
  param: ParameterObject | ReferenceObject,
  doc: OpenAPIObject,
): ParameterObject {
  if (isReferenceObject(param)) {
    const refPath = param.$ref.replace("#/", "").split("/");
    let resolved = doc as unknown;
    for (const segment of refPath) {
      assert(
        typeof resolved === "object" && resolved !== null,
        `Missing reference: ${segment}`,
      );
      resolved = (resolved as Record<string, unknown>)[segment];
    }
    return resolved as ParameterObject;
  }
  return param;
}
