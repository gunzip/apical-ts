import { sanitizeIdentifier } from "../../schema-generator/utils.js";

/**
 * Template parameters for route metadata generation
 */
export interface RouteMetadataTemplateParams {
  hasHeaders: boolean;
  hasPath: boolean;
  /** Flags indicating which parameter types have actual parameters */
  hasQuery: boolean;
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
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
): string {
  const {
    hasHeaders,
    hasPath,
    hasQuery,
    isHeadersOptional,
    isQueryOptional,
    method,
    operationId,
    pathKey,
    requestMapCode,
    requestMapTypeName,
    responseMapCode,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);

  /* Import parameter schemas from schemas directory only if they exist */
  const parsedParamsName = `${sanitizedId}ParsedParams`;
  const serverParsedParamsName = `${sanitizedId}ServerParsedParams`;

  /* Only generate import if at least one parameter type exists */
  const hasAnyParams = hasQuery || hasPath || hasHeaders;
  const parameterImports = hasAnyParams
    ? `import {
  ${parsedParamsName},
  ${serverParsedParamsName},
} from "../schemas/${sanitizedId}Parameters.js";`
    : "";

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

  /* Build params object dynamically based on which parameter types exist */
  const clientParamsValue = hasAnyParams ? parsedParamsName : "undefined";
  const serverParamsValue = hasAnyParams ? serverParsedParamsName : "undefined";

  const routeObjects = `const baseRoute = {
  path: "${pathKey}",
  method: "${method}",
  operationId: "${sanitizedId}",
  requestMap: ${requestMapFieldValue},
  responseMap: ${responseMapFieldValue},
} as const;

export const clientRoute = {
  ...baseRoute,
  params: ${clientParamsValue},
  isQueryOptional: ${isQueryOptional},
  isHeadersOptional: ${isHeadersOptional},
} as const;

export const serverRoute = {
  ...baseRoute,
  params: ${serverParamsValue},
  isQueryOptional: ${isQueryOptional},
  isHeadersOptional: ${isHeadersOptional},
} as const;`;

  /* Combine all parts */
  const parts = [parameterImports, mapsCode, routeObjects].filter(Boolean);

  return parts.join("\n\n");
}
