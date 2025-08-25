import type { ParameterObject } from "openapi3-ts/oas31";

import type { ParameterAnalysis } from "../models/parameter-models.js";

import { toCamelCase, toValidVariableName } from "../utils.js";

/**
 * Renders destructured parameters for function signature
 */
export function renderDestructuredParameters(
  analysis: ParameterAnalysis,
): string {
  const destructureParams: string[] = [];
  const { structure } = analysis;

  // Path parameters
  if (structure.processed.pathParams.length > 0) {
    destructureParams.push(`path: { ${analysis.pathProperties.join(", ")} }`);
  }

  // Query parameters
  if (structure.processed.queryParams.length > 0) {
    const queryProperties = analysis.queryProperties.map((prop) => prop.name);
    const defaultValue = analysis.optionalityRules.isQueryOptional
      ? " = {}"
      : "";
    destructureParams.push(
      `query: { ${queryProperties.join(", ")} }${defaultValue}`,
    );
  }

  // Header parameters
  if (
    structure.processed.headerParams.length > 0 ||
    structure.processed.securityHeaders.length > 0
  ) {
    const headerProperties: string[] = [];

    // Regular header parameters
    analysis.headerProperties.forEach((prop) => {
      if (prop.needsQuoting) {
        headerProperties.push(`"${prop.name}": ${prop.varName}`);
      } else {
        headerProperties.push(prop.name);
      }
    });

    // Security headers
    analysis.securityHeaderProperties.forEach((prop) => {
      headerProperties.push(`"${prop.headerName}": ${prop.varName}`);
    });

    const defaultValue = analysis.optionalityRules.isHeadersOptional
      ? " = {}"
      : "";
    destructureParams.push(
      `headers: { ${headerProperties.join(", ")} }${defaultValue}`,
    );
  }

  // Body parameter
  if (structure.hasBody && structure.bodyTypeInfo) {
    const defaultValue = structure.bodyTypeInfo.isRequired
      ? ""
      : " = undefined";
    destructureParams.push(`body${defaultValue}`);
  }

  // ContentType parameter
  if (structure.hasRequestMap || structure.hasResponseMap) {
    destructureParams.push("contentType = {}");
  }

  return destructureParams.length > 0
    ? `{ ${destructureParams.join(", ")} }`
    : "{}";
}

/**
 * Renders parameter handling code for headers
 */
export function renderParameterHandling(
  paramType: "header" | "query",
  params: ParameterObject[],
): string {
  if (params.length === 0) return "";

  if (paramType === "header") {
    return params
      .map((p) => {
        const varName = toValidVariableName(p.name);
        return `if (${varName} !== undefined) finalHeaders['${p.name}'] = String(${varName});`;
      })
      .join("\n    ");
  } else {
    return params
      .map((p) => {
        const varName = toCamelCase(p.name);
        return `if (${varName} !== undefined) url.searchParams.append('${p.name}', String(${varName}));`;
      })
      .join("\n    ");
  }
}

/**
 * Renders TypeScript interface for parameters
 */
export function renderParameterInterface(analysis: ParameterAnalysis): string {
  const sections: string[] = [];
  const { structure } = analysis;

  // Path parameters section (never optional if present)
  if (structure.processed.pathParams.length > 0) {
    const pathProperties = analysis.pathProperties.map(
      (name) => `${name}: string`,
    );
    sections.push(`path: {\n    ${pathProperties.join(";\n    ")};\n  }`);
  }

  // Query parameters section
  if (structure.processed.queryParams.length > 0) {
    const queryProperties = analysis.queryProperties.map(
      (prop) => `${prop.name}${prop.isRequired ? "" : "?"}: string`,
    );
    const optionalMarker = analysis.optionalityRules.isQueryOptional ? "?" : "";
    sections.push(
      `query${optionalMarker}: {\n    ${queryProperties.join(";\n    ")};\n  }`,
    );
  }

  // Header parameters section
  if (
    structure.processed.headerParams.length > 0 ||
    structure.processed.securityHeaders.length > 0
  ) {
    const headerProperties: string[] = [];

    // Regular header parameters
    analysis.headerProperties.forEach((prop) => {
      const requiredMarker = prop.isRequired ? "" : "?";
      if (prop.needsQuoting) {
        headerProperties.push(`"${prop.name}"${requiredMarker}: string`);
      } else {
        headerProperties.push(`${prop.name}${requiredMarker}: string`);
      }
    });

    // Security headers
    analysis.securityHeaderProperties.forEach((prop) => {
      const requiredMarker = prop.isRequired ? "" : "?";
      headerProperties.push(`"${prop.headerName}"${requiredMarker}: string`);
    });

    const optionalMarker = analysis.optionalityRules.isHeadersOptional
      ? "?"
      : "";
    sections.push(
      `headers${optionalMarker}: {\n    ${headerProperties.join(";\n    ")};\n  }`,
    );
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
