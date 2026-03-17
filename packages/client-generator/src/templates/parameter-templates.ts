import type { ParameterAnalysis } from "@apical-ts/core-utils/shared";
import type { ParameterObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import assert from "assert";

/**
 * Renders simple parameters for function signature (no destructuring to avoid duplicate identifiers)
 */
export function renderDestructuredParameters(
  analysis: ParameterAnalysis,
): string {
  const params: string[] = [];
  const { structure } = analysis;

  // Add single params parameter for all parameter types
  if (
    structure.processed.pathParams.length > 0 ||
    structure.processed.queryParams.length > 0 ||
    structure.processed.headerParams.length > 0 ||
    structure.processed.securityHeaders.length > 0 ||
    structure.hasBody ||
    structure.hasRequestMap ||
    structure.hasResponseMap
  ) {
    params.push("params");
  }

  return params.length > 0 ? params[0] : "{}";
}

/**
 * Renders parameter handling code for headers and queries using bracket notation
 */
export function renderParameterHandling(
  paramType: "header" | "query",
  params: ParameterObject[],
): string {
  if (params.length === 0) return "";

  if (paramType === "header") {
    return params
      .map((p) => {
        /* Extract OpenAPI serialization options */
        const style = p.style || "simple";
        const explode = p.explode !== false; // Default to true for headers per OpenAPI spec

        return `if (params.headers?.["${p.name}"] !== undefined) {
      const serialized = serializeHeaderParam("${p.name}", params.headers["${p.name}"], { style: "${style}", explode: ${explode} });
      if (serialized) finalHeaders['${p.name}'] = serialized;
    }`;
      })
      .join("\n    ");
  } else {
    return params
      .map((p) => {
        /* Extract OpenAPI serialization options */
        const style = p.style || "form";
        const explode = p.explode !== false; // Default to true for query params per OpenAPI spec

        return `if (params.query?.["${p.name}"] !== undefined) {
      const serialized = serializeQueryParam("${p.name}", params.query["${p.name}"], { style: "${style}", explode: ${explode} });
      for (const [key, value] of serialized) {
        url.searchParams.append(key, value);
      }
    }`;
      })
      .join("\n    ");
  }
}

/**
 * Renders TypeScript interface for parameters (using a params object instead of destructuring)
 */
export function renderParameterInterface(analysis: ParameterAnalysis): string {
  /* Use the params type alias generated from the route */
  assert(
    analysis.operationId,
    "Operation ID is required for parameter interface generation",
  );

  const sanitizedOperationId = sanitizeIdentifier(analysis.operationId);
  const operationName =
    sanitizedOperationId.charAt(0).toUpperCase() +
    sanitizedOperationId.slice(1);
  /* Add generic type parameters only for the ones we actually use */
  const hasRequestGeneric = analysis.structure.hasRequestMap;
  const hasResponseGeneric = analysis.structure.hasResponseMap;

  if (hasRequestGeneric || hasResponseGeneric) {
    const genericParts: string[] = [];
    if (hasRequestGeneric) genericParts.push("TRequestContentType");
    if (hasResponseGeneric) genericParts.push("TResponseContentType");
    return `${operationName}Params<${genericParts.join(", ")}>`;
  }

  return `${operationName}Params`;
}
