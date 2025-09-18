import type { ParameterObject } from "openapi3-ts/oas31";

import type { ParameterAnalysis } from "../models/parameter-models.js";

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
      .map(
        (p) =>
          `if (params.headers?.["${p.name}"] !== undefined) finalHeaders['${p.name}'] = String(params.headers["${p.name}"]);`,
      )
      .join("\n    ");
  } else {
    return params
      .map(
        (p) =>
          `if (params.query?.["${p.name}"] !== undefined) url.searchParams.append('${p.name}', String(params.query["${p.name}"]));`,
      )
      .join("\n    ");
  }
}

/**
 * Renders TypeScript interface for parameters (using a params object instead of destructuring)
 */
export function renderParameterInterface(analysis: ParameterAnalysis): string {
  const sections: string[] = [];
  const { structure } = analysis;

  // Check if we need a params object at all
  const needsParams =
    structure.processed.pathParams.length > 0 ||
    structure.processed.queryParams.length > 0 ||
    structure.processed.headerParams.length > 0 ||
    structure.processed.securityHeaders.length > 0;

  if (needsParams) {
    const pathSection = renderPathParametersSection(analysis);
    if (pathSection) sections.push(pathSection);

    const querySection = renderQueryParametersSection(analysis);
    if (querySection) sections.push(querySection);

    const headerSection = renderHeaderParametersSection(analysis);
    if (headerSection) sections.push(headerSection);
  }

  // Body parameter
  if (structure.hasBody && structure.bodyTypeInfo) {
    const requiredMarker = structure.bodyTypeInfo.isRequired ? "" : "?";
    let typeName = structure.bodyTypeInfo.typeName || "any";

    // Use generic type if we have a request map
    if (structure.requestMapTypeName) {
      typeName = `${structure.requestMapTypeName}[TRequestContentType]`;
    }

    sections.push(`body${requiredMarker}: ${typeName}`);
  }

  // ContentType parameter
  if (structure.requestMapTypeName || structure.responseMapTypeName) {
    const contentTypeParts: string[] = [];

    if (structure.requestMapTypeName) {
      contentTypeParts.push("request?: TRequestContentType");
    }

    if (structure.responseMapTypeName) {
      contentTypeParts.push("response?: TResponseContentType");
    }

    sections.push(`contentType?: { ${contentTypeParts.join("; ")} }`);
  }

  return sections.length > 0 ? `{\n  ${sections.join(";\n  ")};\n}` : "{}";
}

/* Helper functions for rendering parameter sections */

/**
 * Renders header parameters section for the params interface
 */
function renderHeaderParametersSection(
  analysis: ParameterAnalysis,
): null | string {
  const { structure } = analysis;
  if (
    structure.processed.headerParams.length === 0 &&
    structure.processed.securityHeaders.length === 0
  ) {
    return null;
  }

  const headerProperties: string[] = [];

  // Regular header parameters
  analysis.headerProperties.forEach((prop) => {
    const requiredMarker = prop.isRequired ? "" : "?";
    headerProperties.push(`"${prop.name}"${requiredMarker}: string`);
  });

  // Security headers
  analysis.securityHeaderProperties.forEach((prop) => {
    const requiredMarker = prop.isRequired ? "" : "?";
    headerProperties.push(`"${prop.headerName}"${requiredMarker}: string`);
  });

  const optionalMarker = analysis.optionalityRules.isHeadersOptional ? "?" : "";
  return `headers${optionalMarker}: {\n      ${headerProperties.join(";\n      ")};\n    }`;
}

/**
 * Renders path parameters section for the params interface
 */
function renderPathParametersSection(
  analysis: ParameterAnalysis,
): null | string {
  if (analysis.structure.processed.pathParams.length === 0) return null;

  const pathProperties: string[] = [];
  analysis.pathProperties.forEach((prop) => {
    const requiredMarker = prop.isRequired ? "" : "?";
    pathProperties.push(`"${prop.name}"${requiredMarker}: string`);
  });
  return `path: {\n      ${pathProperties.join(";\n      ")};\n    }`;
}

/**
 * Renders query parameters section for the params interface
 */
function renderQueryParametersSection(
  analysis: ParameterAnalysis,
): null | string {
  if (analysis.structure.processed.queryParams.length === 0) return null;

  const queryProperties: string[] = [];
  analysis.queryProperties.forEach((prop) => {
    const requiredMarker = prop.isRequired ? "" : "?";
    queryProperties.push(`"${prop.name}"${requiredMarker}: string`);
  });
  const optionalMarker = analysis.optionalityRules.isQueryOptional ? "?" : "";
  return `query${optionalMarker}: {\n      ${queryProperties.join(";\n      ")};\n    }`;
}
