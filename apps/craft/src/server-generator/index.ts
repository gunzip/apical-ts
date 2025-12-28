import type { OpenAPIObject } from "openapi3-ts/oas31";

import pLimit from "p-limit";

import {
  extractAllOperations,
  type OperationMetadata,
} from "../shared/operation-extractor.js";
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
): Promise<void> {
  const serverOperationsDir = await createServerOperationsDirectory(outputDir);

  const operations = await processServerOperations(
    doc,
    serverOperationsDir,
    concurrency,
  );

  await writeServerIndexFile(operations, serverOperationsDir);
}

/**
 * Processes and writes server operation wrapper files
 */
async function processServerOperations(
  doc: OpenAPIObject,
  serverOperationsDir: string,
  concurrency: number,
): Promise<OperationMetadata[]> {
  const operations = extractAllOperations(doc);
  const limit = pLimit(concurrency);
  const operationPromises: Promise<void>[] = [];

  for (const { method, operation, operationId, pathKey } of operations) {
    const promise = limit(async () => {
      const { wrapperCode } = generateServerOperationWrapper(
        pathKey,
        method,
        operation,
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

/* Re-export key types for external use */
export type { OperationMetadata } from "../shared/operation-extractor.js";
export { extractAllOperations } from "../shared/operation-extractor.js";
export { generateServerOperationWrapper } from "./operation-wrapper-generator.js";
