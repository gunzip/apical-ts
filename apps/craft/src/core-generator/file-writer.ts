import { promises as fs } from "fs";

import { ImportManager } from "./import-types.js";

/**
 * Builds the complete operation file content with imports and function code
 */
export function buildOperationFileContent(
  importManager: ImportManager,
  functionCode: string,
): string {
  const importLines = buildImportStatements(importManager, functionCode);
  return `${importLines.join("\n")}\n\n${functionCode}`;
}

/**
 * Creates a directory if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

/**
 * Writes TypeScript content to a file at the specified path.
 */
export async function writeTypeScriptFile(
  filePath: string,
  content: string,
): Promise<void> {
  try {
    await fs.writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Builds import statements from ImportManager
 */
function buildImportStatements(
  importManager: ImportManager,
  functionCode?: string,
): string[] {
  const imports: string[] = [];

  /* Add config imports */
  const configImports = getConfigImports(functionCode);
  imports.push(
    `import type { ${configImports.typeImports.join(", ")} } from "./config.js";`,
  );
  imports.push(
    `import { ${configImports.valueImports.join(", ")} } from "./config.js";`,
  );

  /* Add Zod import if needed (either explicit via ImportManager or implicit via z.infer usage) */
  if (importManager.hasZodImport() || functionCode?.includes("z.infer")) {
    imports.push(`import * as z from "zod";`);
  }

  /* Schema imports removed: all schemas are available through request/response maps from routes */

  /* Add route imports (requestMap, responseMap, clientRoute) */
  const routeImportsByFile = new Map<string, Set<string>>();
  for (const routeImport of importManager.getRouteImports()) {
    if (!routeImport.filePath) continue;
    if (!routeImportsByFile.has(routeImport.filePath)) {
      routeImportsByFile.set(routeImport.filePath, new Set());
    }
    const importName = routeImport.alias
      ? `${routeImport.name} as ${routeImport.alias}`
      : routeImport.name;
    routeImportsByFile.get(routeImport.filePath)?.add(importName);
  }
  for (const [filePath, names] of routeImportsByFile.entries()) {
    imports.push(
      `import { ${Array.from(names).join(", ")} } from "${filePath}";`,
    );
  }

  /* Parameter imports removed: parameters are available through clientRoute.params from routes */

  return imports;
}

/**
 * Determines dynamic config imports based on function code usage
 */
function getConfigImports(functionCode?: string): {
  typeImports: string[];
  valueImports: string[];
} {
  const configTypeImports = ["GlobalConfig", "ApiResponse", "ApiResponseError"];
  const configValueImports = [
    "globalConfig",
    "parseResponseBody",
    "parseApiResponseUnknownData",
  ];

  if (functionCode?.includes("ApiResponseWithParse")) {
    configTypeImports.push("ApiResponseWithParse");
  }

  if (functionCode?.includes("ApiResponseWithForcedParse")) {
    configTypeImports.push("ApiResponseWithForcedParse");
  }

  if (functionCode?.includes("createForcedParseResponse")) {
    configValueImports.push("createForcedParseResponse");
  }

  if (functionCode?.includes("formUrlEncode(")) {
    configValueImports.push("formUrlEncode");
  }

  if (functionCode?.includes("buildFormData(")) {
    configValueImports.push("buildFormData");
  }

  if (functionCode?.includes("serializeQueryParam(")) {
    configValueImports.push("serializeQueryParam");
  }

  if (functionCode?.includes("serializePathParam(")) {
    configValueImports.push("serializePathParam");
  }

  if (functionCode?.includes("serializeHeaderParam(")) {
    configValueImports.push("serializeHeaderParam");
  }

  if (functionCode?.includes("RequestBody")) {
    configTypeImports.push("RequestBody");
  }

  return { typeImports: configTypeImports, valueImports: configValueImports };
}
