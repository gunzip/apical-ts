import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { ImportManager } from "../core-generator/import-types.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateResponseMap } from "../shared/response-maps.js";
import { generateResponseUnion } from "../shared/response-union-generator.js";
import { generateServerRequestBodyMap } from "../shared/server-request-body-maps.js";
import {
  extractRouteOperationMetadata,
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
    requestMapTypeName: string;
    responseMapTypeName: string;
    serverRequestBodyMap: ReturnType<typeof generateServerRequestBodyMap>;
    shouldGenerateRequestMap: boolean;
  };
  operation: OperationObject;
  operationId: string;
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

  const { serverRequestBodyMap } = metadata.bodyInfo;

  /* Add imports for request schemas */
  for (const typeImport of serverRequestBodyMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  /* Convert the client generator format (with semicolons) to object literal format (with commas) */
  const fixedMapType = serverRequestBodyMap.requestMapType.replace(/;/g, ",");

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
  /* Create a temporary Set to collect type imports */
  const typeImports = new Set<string>();

  /* Generate response union type using existing logic */
  const unionResult = generateResponseUnion(
    metadata.operation,
    metadata.operationId,
    typeImports,
    doc,
  );

  /* Generate response map using shared logic */
  const responseMapResult = generateResponseMap(
    metadata.operation,
    metadata.operationId,
    typeImports,
    doc,
    {},
  );

  /* Add type imports to ImportManager */
  for (const typeImport of typeImports) {
    importManager.addSchemaImport(typeImport);
  }
  for (const typeImport of responseMapResult.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  /* Generate response map constant and type */
  const responseMapName = `${sanitizeIdentifier(metadata.operationId)}ResponseMap`;

  let responseMapCode = "";
  if (responseMapResult.shouldGenerateResponseMap) {
    responseMapCode = `export const ${responseMapName} = ${responseMapResult.responseMapType} as const;
export type ${responseMapName} = typeof ${responseMapName};`;
  } else {
    responseMapCode = `export const ${responseMapName} = {} as const;
export type ${responseMapName} = typeof ${responseMapName};`;
  }

  /* Combine both the union type and the response map */
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
  const metadata = extractCompleteRouteMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
  );

  const importManager = new ImportManager();

  /* Build request map (always, even if empty) */
  const requestMapCode = buildRequestMap(metadata, importManager);

  /* Build response map */
  const responseMapCode = buildResponseMap(metadata, importManager, doc);

  /* Render the complete route metadata */
  const routeCode = renderRouteMetadata({
    method: method.toLowerCase(),
    operationId: metadata.operationId,
    pathKey,
    requestMapCode,
    requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
    responseMapCode,
    responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
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
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): RouteOperationMetadata {
  const operationId = operation.operationId;
  if (!operationId) {
    throw new Error("Operation ID is required for route generation");
  }

  /* Use lightweight extractor instead of heavyweight client generator */
  const lightweightMeta = extractRouteOperationMetadata(
    pathKey,
    method,
    operation,
    pathLevelParameters,
    doc,
  );

  /* Generate server request body map (server-specific addition) */
  const typeImports = new Set<string>();
  const serverRequestBodyMap = generateServerRequestBodyMap(
    operation,
    operationId,
    typeImports,
  );

  return {
    bodyInfo: {
      contentTypeMaps: lightweightMeta.bodyInfo.contentTypeMaps,
      hasBody: lightweightMeta.bodyInfo.hasBody,
      requestMapTypeName: lightweightMeta.bodyInfo.requestMapTypeName,
      responseMapTypeName: lightweightMeta.bodyInfo.responseMapTypeName,
      serverRequestBodyMap,
      shouldGenerateRequestMap:
        lightweightMeta.bodyInfo.shouldGenerateRequestMap,
    },
    operation,
    operationId,
  };
}
