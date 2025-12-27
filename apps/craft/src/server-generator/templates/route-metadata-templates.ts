import type { ServerOperationMetadata } from "../operation-wrapper-generator.js";

import { ImportManager } from "../../core-generator/import-types.js";
import { sanitizeIdentifier } from "../../schema-generator/utils.js";

/**
 * Template parameters for route metadata generation
 */
export interface RouteMetadataTemplateParams {
  /** HTTP method in lowercase (e.g., "get", "post") */
  method: string;
  operationId: string;
  /** Original OpenAPI path including path parameters (e.g., "/pets/{petId}") */
  pathKey: string;
  requestMapCode: string;
  requestMapTypeName?: string;
  responseMapCode: string;
  responseMapTypeName?: string;
}

/**
 * Renders the complete route metadata module without wrapper property
 */
export function renderRouteMetadata(
  params: RouteMetadataTemplateParams,
  importManager: ImportManager,
): string {
  const {
    method,
    operationId,
    pathKey,
    requestMapCode,
    requestMapTypeName,
    responseMapCode,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);

  /* Import parameter schemas from schemas directory */
  const parsedParamsName = `${sanitizedId}ParsedParams`;
  const serverParsedParamsName = `${sanitizedId}ServerParsedParams`;
  const parameterImports = `import {
  ${parsedParamsName},
  ${serverParsedParamsName},
} from "../schemas/${sanitizedId}Parameters.js";`;

  /* Build request/response maps if needed */
  const mapsCode = [requestMapCode, responseMapCode]
    .filter(Boolean)
    .join("\n\n");

  /* Build base route object and client/server variants */
  const responseMapFieldValue = responseMapTypeName
    ? `${sanitizedId}ResponseMap`
    : "{}";

  const requestMapFieldValue = requestMapTypeName
    ? `${sanitizedId}RequestMap`
    : "{}";

  const routeObjects = `const baseRoute = {
  path: "${pathKey}",
  method: "${method}",
  operationId: "${sanitizedId}",
  requestMap: ${requestMapFieldValue},
  responseMap: ${responseMapFieldValue},
} as const;

export const clientRoute = {
  ...baseRoute,
  params: ${parsedParamsName},
} as const;

export const serverRoute = {
  ...baseRoute,
  params: ${serverParsedParamsName},
} as const;`;

  /* Combine all parts */
  const parts = [parameterImports, mapsCode, routeObjects].filter(Boolean);

  return parts.join("\n\n");
}
