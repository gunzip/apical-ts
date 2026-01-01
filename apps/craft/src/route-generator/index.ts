import type { OpenAPIObject } from "openapi3-ts/oas31";

import pLimit from "p-limit";

import {
  extractAllOperations,
  type OperationMetadata,
} from "../shared/operation-extractor.js";
import {
  createRoutesDirectory,
  writeRouteMetadataFile,
  writeRoutesIndexFile,
} from "./file-writer.js";
import { generateRouteMetadata } from "./route-metadata-generator.js";

/**
 * Generates route metadata for all operations
 */
export async function generateRoutes(
  doc: OpenAPIObject,
  outputDir: string,
  concurrency: number,
): Promise<void> {
  const routesDir = await createRoutesDirectory(outputDir);

  const operations = await processRoutes(doc, routesDir, concurrency);

  await writeRoutesIndexFile(operations, routesDir);
}

/**
 * Processes and writes route metadata files with concurrency control
 */
async function processRoutes(
  doc: OpenAPIObject,
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
      const { importManager, routeCode } = generateRouteMetadata(
        pathKey,
        method,
        operation,
        pathLevelParameters,
        doc,
      );

      await writeRouteMetadataFile(
        operationId,
        routeCode,
        importManager,
        routesDir,
      );
    });
    operationPromises.push(promise);
  }

  await Promise.all(operationPromises);
  return operations;
}

export {
  createRoutesDirectory,
  writeRouteMetadataFile,
  writeRoutesIndexFile,
} from "./file-writer.js";
/* Route generator module exports */
export {
  buildRequestMap,
  buildResponseMap,
  type GeneratedRouteMetadata,
  generateRouteMetadata,
  type RouteOperationMetadata,
} from "./route-metadata-generator.js";
export {
  extractRouteOperationMetadata,
  type RouteOperationMetadata as LightweightRouteOperationMetadata,
} from "./route-operation-extractor.js";
export {
  renderRouteMetadata,
  type RouteMetadataTemplateParams,
} from "./templates/route-metadata-templates.js";
