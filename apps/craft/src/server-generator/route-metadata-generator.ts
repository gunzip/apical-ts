import type { OpenAPIObject } from "openapi3-ts/oas31";

import type { ServerOperationMetadata } from "./operation-wrapper-generator.js";

import { ImportManager } from "../core-generator/import-types.js";
import { renderRouteMetadata } from "./templates/route-metadata-templates.js";
import {
  buildServerRequestMap,
  buildServerResponseMap,
} from "./templates/server-operation-templates.js";

/* Result of generating a route metadata module with imports */
export interface GeneratedRouteMetadata {
  importManager: ImportManager;
  routeCode: string;
}

/**
 * Generates route metadata module for an operation
 */
export function generateRouteMetadata(
  pathKey: string,
  method: string,
  metadata: ServerOperationMetadata,
  doc: OpenAPIObject,
): GeneratedRouteMetadata {
  const importManager = new ImportManager();

  /* Build request map if needed - reuse server wrapper logic */
  const requestMapCode = metadata.bodyInfo.shouldGenerateRequestMap
    ? buildServerRequestMap(metadata, importManager)
    : "";

  /* Build response map - reuse server wrapper logic */
  const responseMapCode = buildServerResponseMap(metadata, importManager, doc);

  /* Render the complete route metadata */
  const routeCode = renderRouteMetadata(
    {
      method: method.toLowerCase(),
      operationId: metadata.operationId,
      pathKey,
      requestMapCode,
      requestMapTypeName: metadata.bodyInfo.requestMapTypeName,
      responseMapCode,
      responseMapTypeName: metadata.bodyInfo.responseMapTypeName,
    },
    importManager,
  );

  return {
    importManager,
    routeCode,
  };
}
