import type {
  OperationGenerationMetadata,
  OperationMetadata,
} from "@apical-ts/core-utils/shared";
import type { OpenAPIObject } from "openapi3-ts/oas31";

import { extractServerUrls } from "@apical-ts/core-utils/shared";
import { extractAuthHeaders } from "@apical-ts/core-utils/shared";
import { extractAllOperationGenerationMetadata } from "@apical-ts/core-utils/shared";
import pLimit from "p-limit";

import {
  createOperationsDirectory,
  writeConfigFile,
  writeIndexFile,
  writeOperationFile,
} from "./file-writer.js";
import { generateOperationFunctionFromMetadata } from "./operation-function-generator.js";

/**
 * Generates individual operation files and configuration
 */
export async function generateOperations(
  doc: OpenAPIObject,
  outputDir: string,
  concurrency: number,
  operationMetadata = extractAllOperationGenerationMetadata(doc),
): Promise<void> {
  const operationsDir = await createOperationsDirectory(outputDir);

  // Extract auth headers for configuration types
  const authHeaders = extractAuthHeaders(doc);
  const serverUrls = extractServerUrls(doc);

  // Process all operations and write files
  const operations = await processOperations(
    doc,
    operationsDir,
    concurrency,
    operationMetadata,
  );

  // Write configuration file
  await writeConfigFile(authHeaders, serverUrls, operationsDir);

  // Write index file that exports all operations
  await writeIndexFile(operations, operationsDir);
}

/**
 * Processes and writes operation files
 */
async function processOperations(
  doc: OpenAPIObject,
  operationsDir: string,
  concurrency: number,
  operationMetadata: OperationGenerationMetadata[],
): Promise<OperationMetadata[]> {
  const limit = pLimit(concurrency);
  const operationPromises: Promise<void>[] = [];

  for (const metadata of operationMetadata) {
    const promise = limit(async () => {
      const { functionCode, importManager } =
        generateOperationFunctionFromMetadata(metadata, doc);

      await writeOperationFile(
        metadata.operationId,
        functionCode,
        importManager,
        operationsDir,
      );
    });
    operationPromises.push(promise);
  }

  await Promise.all(operationPromises);
  return operationMetadata;
}

export {
  extractOperationMetadata,
  generateOperationFunction,
} from "./operation-function-generator.js";
export type { RequestBodyTypeInfo } from "./request-body.js";
export type { OperationMetadata as OperationFunctionMetadata } from "./templates/operation-templates.js";
export {
  buildGenericParams,
  buildParameterDeclaration,
  renderOperationFunction,
} from "./templates/operation-templates.js";
export { toValidVariableName } from "./utils.js";
export type { ParameterGroups } from "@apical-ts/core-utils/shared";
export type { SecurityHeader } from "@apical-ts/core-utils/shared";

/* Re-export key types and functions for external use */
export type { OperationMetadata } from "@apical-ts/core-utils/shared";

export { extractAllOperations } from "@apical-ts/core-utils/shared";

export { extractServerUrls } from "@apical-ts/core-utils/shared";

export { extractAuthHeaders } from "@apical-ts/core-utils/shared";
