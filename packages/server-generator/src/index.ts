import type { OpenAPIObject } from "openapi3-ts/oas31";

import {
  extractAllOperations,
  type ImportExtension,
  type OperationMetadata,
} from "@apical-ts/core-utils/shared";
import pLimit from "p-limit";

import {
  createServerOperationsDirectory,
  writeServerIndexFile,
  writeServerOperationFile,
} from "./file-writer.js";
import { generateServerOperationWrapper } from "./operation-wrapper-generator.js";

/**
 * Generates server endpoint wrappers for all operations
 */
export async function generateServerOperations(
  doc: OpenAPIObject,
  outputDir: string,
  concurrency: number,
  options: { importExtension?: ImportExtension } = {},
): Promise<void> {
  const serverOperationsDir = await createServerOperationsDirectory(outputDir);

  const operations = await processServerOperations(
    doc,
    serverOperationsDir,
    concurrency,
    options,
  );

  await writeServerIndexFile(operations, serverOperationsDir, options);
}

/**
 * Processes and writes server operation wrapper files
 */
async function processServerOperations(
  doc: OpenAPIObject,
  serverOperationsDir: string,
  concurrency: number,
  options: { importExtension?: ImportExtension } = {},
): Promise<OperationMetadata[]> {
  const operations = extractAllOperations(doc);
  const limit = pLimit(concurrency);
  const operationPromises: Promise<void>[] = [];

  for (const {
    method,
    operation,
    operationId,
    pathKey,
    pathLevelParameters,
  } of operations) {
    const promise = limit(async () => {
      const { wrapperCode } = generateServerOperationWrapper(
        pathKey,
        method,
        operation,
        pathLevelParameters,
        doc,
        options,
      );

      await writeServerOperationFile(
        operationId,
        wrapperCode,
        serverOperationsDir,
      );
    });
    operationPromises.push(promise);
  }

  await Promise.all(operationPromises);
  return operations;
}

export { generateServerOperationWrapper } from "./operation-wrapper-generator.js";
/* Re-export key types for external use */
export type { OperationMetadata } from "@apical-ts/core-utils/shared";
export { extractAllOperations } from "@apical-ts/core-utils/shared";
