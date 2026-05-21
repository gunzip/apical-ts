import { sanitizeIdentifier } from "@apical-ts/core-utils";

/**
 * Template parameters for route metadata generation
 */
export interface RouteMetadataTemplateParams {
  clientIsHeadersOptional: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  /** Flags indicating which parameter types have actual parameters */
  hasQuery: boolean;
  isQueryOptional: boolean;
  /** HTTP method in lowercase (e.g., "get", "post") */
  method: string;
  operationId: string;
  /** Original OpenAPI path including path parameters (e.g., "/pets/{petId}") */
  pathKey: string;
  requestMapCode: string;
  requestMapTypeName?: string;
  responseHeadersMapTypeName?: string;
  responseMapCode: string;
  responseMapTypeName?: string;
  serverIsHeadersOptional: boolean;
}

/**
 * Renders the complete route metadata module without wrapper property
 */
export function renderRouteMetadata(
  params: RouteMetadataTemplateParams,
): string {
  const {
    clientIsHeadersOptional,
    hasHeaders,
    hasPath,
    hasQuery,
    isQueryOptional,
    method,
    operationId,
    pathKey,
    requestMapCode,
    requestMapTypeName,
    responseHeadersMapTypeName,
    responseMapCode,
    responseMapTypeName,
    serverIsHeadersOptional,
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
} from "../schemas/${sanitizedId}Parameters.ts";`
    : "";

  /* Build request/response maps if needed */
  const mapsCode = [requestMapCode, responseMapCode]
    .filter(Boolean)
    .join("\n\n");

  /* Build base route object and client/server variants */
  const responseMapFieldValue = responseMapTypeName
    ? `${sanitizedId}ResponseMap`
    : "{}";
  const responseHeadersMapFieldValue = responseHeadersMapTypeName
    ? `${sanitizedId}ResponseHeadersMap`
    : "{}";

  const requestMapFieldValue = requestMapTypeName
    ? `${sanitizedId}RequestMap`
    : "{}";

  /* Build params object dynamically based on which parameter types exist */
  const clientParamsValue = hasAnyParams ? parsedParamsName : "undefined";
  const serverParamsValue = hasAnyParams ? serverParsedParamsName : "undefined";

  /* Inline shared properties into both route objects to avoid spread inference cost */
  const sharedRouteFields = `  path: "${pathKey}",
  method: "${method}",
  operationId: "${sanitizedId}",
  requestMap: ${requestMapFieldValue},
  responseHeadersMap: ${responseHeadersMapFieldValue},
  responseMap: ${responseMapFieldValue},`;

  const routeObjects = `export const clientRoute = {
${sharedRouteFields}
  params: ${clientParamsValue},
  isQueryOptional: ${isQueryOptional},
  isHeadersOptional: ${clientIsHeadersOptional},
} as const;

export const serverRoute = {
${sharedRouteFields}
  params: ${serverParamsValue},
  isQueryOptional: ${isQueryOptional},
  isHeadersOptional: ${serverIsHeadersOptional},
} as const;`;

  /* Combine all parts */
  const parts = [parameterImports, mapsCode, routeObjects].filter(Boolean);

  return parts.join("\n\n");
}
