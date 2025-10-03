import { promises as fs } from "fs";

import {
  categorizeImports,
  groupStructuredParameterImports,
} from "../shared/parameter-utils.js";
import { ImportManager } from "./import-types.js";

/**
 * Builds the complete operation file content with imports and function code
 */
export function buildOperationFileContent(
  typeImports: Set<string>,
  functionCode: string,
  operationId: string,
): string {
  const importManager = createImportManager(typeImports, operationId);
  const importLines = buildImportStatements(importManager, functionCode);
  return `${importLines.join("\n")}\n\n${functionCode}`;
}

/**
 * Builds import statements for operation files with separate type and value imports
 */
export function buildOperationImports(
  typeImports: Set<string>,
  functionCode: string | undefined,
  operationId: string,
): string[] {
  const configImports = getConfigImports(functionCode);
  const imports: string[] = [];

  // Add type imports from config
  imports.push(
    `import type { ${configImports.typeImports.join(", ")} } from "./config.js";`,
  );

  // Add value imports from config
  imports.push(
    `import { ${configImports.valueImports.join(", ")} } from "./config.js";`,
  );

  // Categorize imports using structured approach
  const categorized = categorizeImports(typeImports, operationId);

  // Add Zod import if needed for parameter schemas
  if (categorized.zodImport) {
    imports.push(`import { z } from "zod";`);
  }

  // Add normal schema imports
  categorized.regularImports.forEach((type) => {
    imports.push(`import { ${type} } from "../schemas/${type}.js";`);
  });

  // Add parameter imports grouped by operation
  if (categorized.parameterImports.length > 0) {
    const operationGroups = groupStructuredParameterImports(
      categorized.parameterImports,
    );

    for (const [operationId, paramImports] of operationGroups) {
      const importNames = paramImports.map((pi) => pi.importName);
      imports.push(
        `import { ${importNames.join(", ")} } from "../schemas/${operationId}Parameters.js";`,
      );
    }
  }

  return imports;
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

  /* Add Zod import */
  if (importManager.hasZodImport()) {
    imports.push(`import { z } from "zod";`);
  }

  /* Add schema imports */
  for (const schemaImport of importManager.getSchemaImports()) {
    imports.push(
      `import { ${schemaImport.name} } from "../schemas/${schemaImport.name}.js";`,
    );
  }

  /* Add parameter imports grouped by operation */
  for (const paramGroup of importManager.getParameterGroups()) {
    imports.push(
      `import { ${paramGroup.imports.join(", ")} } from "../schemas/${paramGroup.operationId}Parameters.js";`,
    );
  }

  return imports;
}

/**
 * Creates an import manager from type imports and operation ID
 */
function createImportManager(
  typeImports: Set<string>,
  operationId: string,
): ImportManager {
  const manager = new ImportManager();

  // Categorize imports using structured approach
  const categorized = categorizeImports(typeImports, operationId);

  /* Add Zod import if needed */
  if (categorized.zodImport) {
    manager.addZodImport();
  }

  /* Add regular schema imports */
  for (const imp of categorized.regularImports) {
    manager.addSchemaImport(imp);
  }

  /* Add parameter imports with operation ID */
  for (const paramImport of categorized.parameterImports) {
    // Use the operationId from the structured import info, fallback to provided operationId
    const targetOperationId = paramImport.operationId || operationId;
    if (targetOperationId) {
      manager.addParameterImport(paramImport.importName, targetOperationId);
    } else {
      // If no operation ID available, treat as regular schema import
      manager.addSchemaImport(paramImport.importName);
    }
  }

  return manager;
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
