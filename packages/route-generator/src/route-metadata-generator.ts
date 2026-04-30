import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { ImportManager } from "@apical-ts/core-utils";
import {
  extractOperationGenerationMetadata,
  generateResponseUnion,
  type OperationGenerationMetadata,
} from "@apical-ts/core-utils/shared";

import {
  extractRouteOperationMetadataFromMetadata,
  type RouteOperationMetadata as LightweightRouteMetadata,
} from "./route-operation-extractor.js";
import { renderRouteMetadata } from "./templates/route-metadata-templates.js";

/* Result of generating a route metadata module with imports */
export interface GeneratedRouteMetadata {
  importManager: ImportManager;
  routeCode: string;
}

/**
 * Extended route operation metadata for template generation (includes server request body map)
 */
export interface RouteOperationMetadata {
  bodyInfo: {
    contentTypeMaps: LightweightRouteMetadata["bodyInfo"]["contentTypeMaps"];
    hasBody: boolean;
    requestBodyMap: OperationGenerationMetadata["bodyInfo"]["requestBodyMap"];
    requestMapTypeName: string;
    responseMap: OperationGenerationMetadata["bodyInfo"]["responseMap"];
    responseMapTypeName: string;
    shouldGenerateRequestMap: boolean;
    shouldGenerateResponseMap: boolean;
  };
  functionName: string;
  operation: OperationObject;
  operationId: string;
  parameterInfo: LightweightRouteMetadata["parameterInfo"];
}

/**
 * Builds request map for operations with request bodies
 */
export function buildRequestMap(
  metadata: RouteOperationMetadata,
  importManager: ImportManager,
): string {
  const mapName = metadata.bodyInfo.requestMapTypeName;

  if (!metadata.bodyInfo.shouldGenerateRequestMap) {
    /* Still export an empty map for operations without request bodies */
    return `export const ${mapName} = {} as const;
export type ${mapName} = typeof ${mapName};`;
  }

  for (const typeImport of metadata.bodyInfo.requestBodyMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  /* Convert the type-shape map into an object-literal friendly map */
  const fixedMapType =
    metadata.bodyInfo.requestBodyMap.requestMapType.replaceAll(";", ",");

  return `export const ${mapName} = ${fixedMapType} as const;
export type ${mapName} = typeof ${mapName};`;
}

/**
 * Builds response map for operations
 */
export function buildResponseMap(
  metadata: RouteOperationMetadata,
  importManager: ImportManager,
  doc: OpenAPIObject,
): string {
  const responseTypeImports = new Set<string>();
  const routeResponseTypeName = `${metadata.functionName}RouteResponse`;
  const unionResult = generateResponseUnion(
    metadata.operation,
    metadata.operationId,
    responseTypeImports,
    doc,
    undefined,
    routeResponseTypeName,
  );

  for (const typeImport of metadata.bodyInfo.responseMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }
  for (const typeImport of unionResult.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  const responseMapName = metadata.bodyInfo.responseMapTypeName;
  const responseMapCode = metadata.bodyInfo.shouldGenerateResponseMap
    ? `export const ${responseMapName} = ${metadata.bodyInfo.responseMap.responseMapType} as const;
export type ${responseMapName} = typeof ${responseMapName};`
    : `export const ${responseMapName} = {} as const;
export type ${responseMapName} = typeof ${responseMapName};`;

  return `${responseMapCode}\n\n${unionResult.unionTypeDefinition}`;
}

/**
 * Generates route metadata module for an operation
 */
export function generateRouteMetadata(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): GeneratedRouteMetadata {
  const metadata = extractOperationGenerationMetadata({
    doc,
    method,
    operation,
    pathKey,
    pathLevelParameters,
  });

  return generateRouteMetadataFromMetadata(metadata, doc);
}

export function generateRouteMetadataFromMetadata(
  metadata: OperationGenerationMetadata,
  doc: OpenAPIObject,
): GeneratedRouteMetadata {
  const routeMetadata = extractCompleteRouteMetadata(metadata);
  const importManager = new ImportManager();

  const requestMapCode = buildRequestMap(routeMetadata, importManager);
  const responseMapCode = buildResponseMap(routeMetadata, importManager, doc);
  const routeCode = renderRouteMetadata({
    hasHeaders: routeMetadata.parameterInfo.hasHeaders,
    hasPath: routeMetadata.parameterInfo.hasPath,
    hasQuery: routeMetadata.parameterInfo.hasQuery,
    isHeadersOptional: routeMetadata.parameterInfo.isHeadersOptional,
    isQueryOptional: routeMetadata.parameterInfo.isQueryOptional,
    method: metadata.method.toLowerCase(),
    operationId: routeMetadata.operationId,
    pathKey: metadata.pathKey,
    requestMapCode,
    requestMapTypeName: routeMetadata.bodyInfo.requestMapTypeName,
    responseMapCode,
    responseMapTypeName: routeMetadata.bodyInfo.responseMapTypeName,
  });

  return {
    importManager,
    routeCode,
  };
}

/**
 * Extracts metadata needed for route generation (wrapper that adds server-specific data)
 */
function extractCompleteRouteMetadata(
  metadata: OperationGenerationMetadata,
): RouteOperationMetadata {
  const lightweightMeta = extractRouteOperationMetadataFromMetadata(metadata);

  return {
    bodyInfo: {
      contentTypeMaps: lightweightMeta.bodyInfo.contentTypeMaps,
      hasBody: lightweightMeta.bodyInfo.hasBody,
      requestBodyMap: metadata.bodyInfo.requestBodyMap,
      requestMapTypeName: lightweightMeta.bodyInfo.requestMapTypeName,
      responseMap: metadata.bodyInfo.responseMap,
      responseMapTypeName: lightweightMeta.bodyInfo.responseMapTypeName,
      shouldGenerateRequestMap:
        lightweightMeta.bodyInfo.shouldGenerateRequestMap,
      shouldGenerateResponseMap:
        lightweightMeta.bodyInfo.shouldGenerateResponseMap,
    },
    functionName: metadata.functionName,
    operation: metadata.operation,
    operationId: metadata.operationId,
    parameterInfo: lightweightMeta.parameterInfo,
  };
}
