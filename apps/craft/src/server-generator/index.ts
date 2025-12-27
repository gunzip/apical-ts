import type { OpenAPIObject } from "openapi3-ts/oas31";

import pLimit from "p-limit";

import {
  extractAllOperations,
  type OperationMetadata,
} from "../client-generator/operation-extractor.js";
import {
  createServerOperationsDirectory,
  createRoutesDirectory,
  writeServerIndexFile,
  writeServerOperationFile,
  writeRouteMetadataFile,
  writeRoutesIndexFile,
} from "./file-writer.js";
import {
  extractServerOperationMetadata,
  generateServerOperationWrapper,
} from "./operation-wrapper-generator.js";
import { generateRouteMetadata } from "./route-metadata-generator.js";

/**
 * Generates server endpoint wrappers for all operations
 */
export async function generateServerOperations(
  doc: OpenAPIObject,
  outputDir: string,
  concurrency: number,
): Promise<void> {
  const serverOperationsDir = await createServerOperationsDirectory(outputDir);
  const routesDir = await createRoutesDirectory(outputDir);

  // Process all operations and write both route metadata and server wrapper files
  const operations = await processServerOperations(
    doc,
    serverOperationsDir,
    routesDir,
    concurrency,
  );

  // Write index files for both routes and server wrappers
  await writeRoutesIndexFile(operations, routesDir);
  await writeServerIndexFile(operations, serverOperationsDir);
}

/**
 * Processes and writes server operation wrapper files and route metadata files
 */
async function processServerOperations(
  doc: OpenAPIObject,
  serverOperationsDir: string,
  routesDir: string,
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
      /* Extract server operation metadata (shared between route and wrapper) */
      const metadata = extractServerOperationMetadata(
        pathKey,
        method,
        operation,
        pathLevelParameters,
        doc,
      );

      /* Generate route metadata */
      const { importManager: routeImportManager, routeCode } =
        generateRouteMetadata(pathKey, method, metadata, doc);

      await writeRouteMetadataFile(
        operationId,
        routeCode,
        routeImportManager,
        routesDir,
      );

      /* Generate server wrapper */
      const { importManager, wrapperCode } = generateServerOperationWrapper(
        pathKey,
        method,
        operation,
        pathLevelParameters,
        doc,
      );

      await writeServerOperationFile(
        operationId,
        wrapperCode,
        importManager,
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
export { generateRouteMetadata } from "./route-metadata-generator.js";
