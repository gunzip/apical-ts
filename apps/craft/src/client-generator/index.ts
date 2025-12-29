import type { OpenAPIObject } from "openapi3-ts/oas31";

import pLimit from "p-limit";

import { extractAuthHeaders } from "../shared/security-utils.js";
import {
  createOperationsDirectory,
  writeConfigFile,
  writeIndexFile,
  writeOperationFile,
} from "./file-writer.js";
import {
  extractAllOperations,
  extractServerUrls,
  type OperationMetadata,
} from "./operation-extractor.js";
import { generateOperationFunction } from "./operation-function-generator.js";

/**
 * Generates individual operation files and configuration
 */
export async function generateOperations(
  doc: OpenAPIObject,
  outputDir: string,
  concurrency: number,
): Promise<void> {
  const operationsDir = await createOperationsDirectory(outputDir);

  // Extract auth headers for configuration types
  const authHeaders = extractAuthHeaders(doc);
  const serverUrls = extractServerUrls(doc);

  // Process all operations and write files
  const operations = await processOperations(doc, operationsDir, concurrency);

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
      const { functionCode, importManager } = generateOperationFunction(
        pathKey,
        method,
        operation,
        pathLevelParameters,
        doc,
      );

      await writeOperationFile(
        operationId,
        functionCode,
        importManager,
        operationsDir,
      );
    });
    operationPromises.push(promise);
  }

  await Promise.all(operationPromises);
  return operations;
}

export type { ParameterGroups } from "../shared/models/parameter-models.js";
export type { SecurityHeader } from "../shared/models/security-models.js";
/* Re-export key types and functions for external use */
export type { OperationMetadata } from "../shared/operation-extractor.js";
export { extractAuthHeaders } from "../shared/security-utils.js";
export {
  extractAllOperations,
  extractServerUrls,
} from "./operation-extractor.js";
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
