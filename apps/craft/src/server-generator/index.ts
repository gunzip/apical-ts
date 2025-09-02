import type { OpenAPIObject } from "openapi3-ts/oas31";

import pLimit from "p-limit";

import {
  extractAllOperations,
  type OperationMetadata,
} from "../client-generator/operation-extractor.js";
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

  // Process all operations and write server wrapper files
  const operations = await processServerOperations(
    doc,
    serverOperationsDir,
    concurrency,
  );

  // Write index file that exports all server wrappers
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

  for (const {
    method,
    operation,
    operationId,
    pathKey,
    pathLevelParameters,
  } of operations) {
    const promise = limit(async () => {
      const { typeImports, wrapperCode } = generateServerOperationWrapper(
        pathKey,
        method,
        operation,
        pathLevelParameters,
        doc,
      );

      await writeServerOperationFile(
        operationId,
        wrapperCode,
        typeImports,
        serverOperationsDir,
      );
    });
    operationPromises.push(promise);
  }

  await Promise.all(operationPromises);
  return operations;
}

/* Re-export key types for external use */
export type { OperationMetadata } from "../client-generator/operation-extractor.js";
export { extractAllOperations } from "../client-generator/operation-extractor.js";
export {
  extractServerOperationMetadata,
  generateServerOperationWrapper,
} from "./operation-wrapper-generator.js";
