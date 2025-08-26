import { promises as fs } from "fs";
import path from "path";

import type { OperationMetadata } from "./operation-extractor.js";

import {
  buildOperationFileContent,
  writeFormattedFile,
} from "../core-generator/file-writer.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateConfigTypes } from "./config-generator.js";

/**
 * Creates the operations directory if it doesn't exist
 */
export async function createOperationsDirectory(
  outputDir: string,
): Promise<string> {
  const operationsDir = path.join(outputDir, "operations");
  await fs.mkdir(operationsDir, { recursive: true });
  return operationsDir;
}

/**
 * Writes the configuration file
 */
export async function writeConfigFile(
  authHeaders: string[],
  serverUrls: string[],
  operationsDir: string,
): Promise<void> {
  const configContent = generateConfigTypes(authHeaders, serverUrls);
  const configPath = path.join(operationsDir, "config.js");
  await writeFormattedFile(configPath, configContent);
}

/**
 * Writes the index file that exports all operations
 */
export async function writeIndexFile(
  operations: OperationMetadata[],
  operationsDir: string,
): Promise<void> {
  const operationImports: string[] = [];
  const operationExports: string[] = [];
  const seenOperations = new Set<string>(); // Track unique sanitized operation IDs

  for (const { operationId } of operations) {
    const sanitizedOperationId = sanitizeIdentifier(operationId);

    // Fail in case of duplicate sanitized operation IDs
    if (seenOperations.has(sanitizedOperationId)) {
      // Should never happen, this indicates a bug in the specs or in the code
      throw new Error(`Duplicate operation ID: ${operationId}`);
    }

    seenOperations.add(sanitizedOperationId);
    operationImports.push(
      `import { ${sanitizedOperationId} } from './${sanitizedOperationId}.js';`,
    );
    operationExports.push(sanitizedOperationId);
  }

  // Handle case where no valid operations exist
  if (operationExports.length === 0) {
    const indexContent = `// No valid operations found to export`;
    const indexPath = path.join(operationsDir, "index.ts");
    await writeFormattedFile(indexPath, indexContent);
    return;
  }

  const indexContent = `${operationImports.join("\n")}

export {
  ${operationExports.join(",\n  ")},
};`;
  const indexPath = path.join(operationsDir, "index.ts");
  await writeFormattedFile(indexPath, indexContent);
}

/**
 * Writes a single operation file to disk
 */
export async function writeOperationFile(
  operationId: string,
  functionCode: string,
  typeImports: Set<string>,
  operationsDir: string,
): Promise<void> {
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const operationContent = buildOperationFileContent(typeImports, functionCode);
  const operationPath = path.join(operationsDir, `${sanitizedOperationId}.ts`);
  await writeFormattedFile(operationPath, operationContent);
}
