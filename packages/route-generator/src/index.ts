import type { OpenAPIObject } from "openapi3-ts/oas31";

import {
  extractAllOperationGenerationMetadata,
  type OperationGenerationMetadata,
  type OperationMetadata,
} from "@apical-ts/core-utils/shared";
import pLimit from "p-limit";

import {
  createRoutesDirectory,
  writeRouteMetadataFile,
  writeRoutesIndexFile,
} from "./file-writer.js";
import { generateRouteMetadataFromMetadata } from "./route-metadata-generator.js";

/**
 * Generates route metadata for all operations
 */
export async function generateRoutes(
  doc: OpenAPIObject,
  outputDir: string,
  concurrency: number,
  operationMetadata = extractAllOperationGenerationMetadata(doc),
): Promise<void> {
  const routesDir = await createRoutesDirectory(outputDir);

  const operations = await processRoutes(
    doc,
    routesDir,
    concurrency,
    operationMetadata,
  );

  await writeRoutesIndexFile(operations, routesDir);
}

/**
 * Processes and writes route metadata files with concurrency control
 */
async function processRoutes(
  doc: OpenAPIObject,
  routesDir: string,
  concurrency: number,
  operationMetadata: OperationGenerationMetadata[],
): Promise<OperationMetadata[]> {
  const limit = pLimit(concurrency);
  const operationPromises: Promise<void>[] = [];

  for (const metadata of operationMetadata) {
    const promise = limit(async () => {
      const { importManager, routeCode } = generateRouteMetadataFromMetadata(
        metadata,
        doc,
      );

      await writeRouteMetadataFile(
        metadata.operationId,
        routeCode,
        importManager,
        routesDir,
      );
    });
    operationPromises.push(promise);
  }

  await Promise.all(operationPromises);
  return operationMetadata;
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
