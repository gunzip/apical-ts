import type { ImportManager } from "@apical-ts/core-utils";
import type {
  ImportExtension,
  OperationMetadata,
} from "@apical-ts/core-utils/shared";

import {
  buildOperationFileContent,
  writeTypeScriptFile,
} from "@apical-ts/core-utils";
import {
  createOutputSubdirectory,
  createSanitizedOperationEntries,
  formatImportSpecifier,
  writeOperationModuleFile,
} from "@apical-ts/core-utils/shared";
import path from "path";

import { generateConfigTypes } from "./config-generator.js";

/**
 * Creates the operations directory if it doesn't exist
 */
export async function createOperationsDirectory(
  outputDir: string,
): Promise<string> {
  return createOutputSubdirectory(outputDir, "client");
}

/**
 * Writes the client runtime file
 */
export async function writeConfigFile(
  authHeaders: string[],
  serverUrls: string[],
  operationsDir: string,
  options: { importExtension?: ImportExtension } = {},
): Promise<void> {
  const configContent = generateConfigTypes(authHeaders, serverUrls, options);
  const runtimePath = path.join(operationsDir, "runtime.ts");
  await writeTypeScriptFile(runtimePath, configContent);
}

/**
 * Writes the index file that exports all operations
 */
export async function writeIndexFile(
  operations: OperationMetadata[],
  operationsDir: string,
  options: { importExtension?: ImportExtension } = {},
): Promise<void> {
  const { importExtension = "ts" } = options;
  const sanitizedOperations = createSanitizedOperationEntries(operations);
  const operationImports = sanitizedOperations.map(
    ({ sanitizedOperationId }) =>
      `import { ${sanitizedOperationId} } from '${formatImportSpecifier(`./${sanitizedOperationId}`, importExtension)}';`,
  );
  const operationExports = sanitizedOperations.map(
    ({ sanitizedOperationId }) => sanitizedOperationId,
  );

  // Handle case where no valid operations exist
  if (operationExports.length === 0) {
    const indexContent = `// No valid operations found to export`;
    const indexPath = path.join(operationsDir, "index.ts");
    await writeTypeScriptFile(indexPath, indexContent);
    return;
  }

  const indexContent = `${operationImports.join("\n")}

export {
  ${operationExports.join(",\n  ")},
};`;
  const indexPath = path.join(operationsDir, "index.ts");
  await writeTypeScriptFile(indexPath, indexContent);
}

/**
 * Writes a single operation file to disk
 */
export async function writeOperationFile(
  operationId: string,
  functionCode: string,
  importManager: ImportManager,
  operationsDir: string,
): Promise<void> {
  const operationContent = buildOperationFileContent(
    importManager,
    functionCode,
  );
  await writeOperationModuleFile(operationsDir, operationId, operationContent);
}
