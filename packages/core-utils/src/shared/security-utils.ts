import type {
  OpenAPIObject,
  OperationObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";

import type {
  AnalyzedSecurityScheme,
  AuthHeaderRequirements,
  GlobalSecurityAnalysis,
  OperationSecurityAnalysis,
  SecurityHeader,
} from "./models/security-models.js";

export type { SecurityHeader };

/*
 * Pure security analysis functions - separate from code generation
 */

/**
 * Analyzes global security schemes from OpenAPI document
 */
export function analyzeGlobalSecuritySchemes(
  doc: OpenAPIObject,
): GlobalSecurityAnalysis {
  const globalSchemeNames = new Set<string>();
  const authHeaders: string[] = [];
  const analyzedSchemes: AnalyzedSecurityScheme[] = [];

  if (doc.security && doc.components?.securitySchemes) {
    /* Collect all globally required security schemes */
    for (const securityRequirement of doc.security) {
      for (const schemeName of Object.keys(securityRequirement)) {
        globalSchemeNames.add(schemeName);
      }
    }

    /* Analyze each global security scheme */
    for (const [name, scheme] of Object.entries(
      doc.components.securitySchemes,
    )) {
      if (globalSchemeNames.has(name)) {
        const analyzed = analyzeSecurityScheme(
          name,
          scheme as SecuritySchemeObject,
        );
        analyzedSchemes.push(analyzed);

        if (analyzed.isHeaderBased && analyzed.headerName) {
          authHeaders.push(analyzed.headerName);
        }
      }
    }
  }

  return {
    analyzedSchemes,
    authHeaders: [...new Set(authHeaders)], // Remove duplicates
    globalSchemeNames,
  };
}

/**
 * Analyzes a security scheme to determine header information
 */
export function analyzeSecurityScheme(
  schemeName: string,
  scheme: SecuritySchemeObject,
): AnalyzedSecurityScheme {
  let headerName: null | string = null;
  let isHeaderBased = false;

  if (scheme.type === "apiKey" && scheme.in === "header" && scheme.name) {
    headerName = scheme.name;
    isHeaderBased = true;
  } else if (scheme.type === "http" && scheme.scheme === "bearer") {
    headerName = "Authorization";
    isHeaderBased = true;
  }

  return {
    headerName,
    isHeaderBased,
    scheme,
    schemeName,
  };
}

/**
 * Determines auth header requirements for an operation
 */
export function determineAuthHeaderRequirements(
  operation: OperationObject,
  doc: OpenAPIObject,
): AuthHeaderRequirements {
  const globalAnalysis = analyzeGlobalSecuritySchemes(doc);
  const operationAnalysis = processOperationSecurity(operation, doc);

  return {
    globalHeaders: globalAnalysis.authHeaders,
    operationHeaders: operationAnalysis.operationHeaders,
    requiresAuthentication:
      globalAnalysis.authHeaders.length > 0 ||
      operationAnalysis.operationHeaders.length > 0,
  };
}

/**
 * Extracts global auth header names from security schemes (only those used globally)
 */
export function extractAuthHeaders(doc: OpenAPIObject): string[] {
  const analysis = analyzeGlobalSecuritySchemes(doc);
  return analysis.authHeaders;
}

/**
 * Gets operation-specific security schemes that are not global
 */
export function getOperationSecuritySchemes(
  operation: OperationObject,
  doc: OpenAPIObject,
): SecurityHeader[] {
  const operationAnalysis = processOperationSecurity(operation, doc);

  // If there's an override, return only override headers
  // - security: [] → empty array, disables global security, no headers
  // - security: [{}] → empty object, no auth scheme required
  // - security: [{ apiKey: [] }] → requires apiKey scheme, override header required
  if (operationAnalysis.hasOverride) {
    return operationAnalysis.operationHeaders;
  }

  // No override: use global security
  // Marked as isRequired: false because they're optional in config.headers (TypeScript ?)
  // But if the endpoint requires them and you don't provide them, the API will reject the request
  const globalAnalysis = analyzeGlobalSecuritySchemes(doc);
  const globalHeaders: SecurityHeader[] = globalAnalysis.analyzedSchemes
    .filter((s) => s.isHeaderBased && s.headerName)
    .map((s) => ({
      headerName: s.headerName as string,
      isOverride: false, // From global security, not operation.security
      isRequired: false, // Optional in config (don't throw error if missing)
      schemeName: s.schemeName,
    }));

  return globalHeaders;
}

/**
 * Checks if an operation overrides global security (either empty or with specific schemes)
 */
export function hasSecurityOverride(operation: OperationObject): boolean {
  return operation.security !== undefined;
}

/**
 * Processes operation-specific security requirements
 * - security: [] → hasOverride: true, operationHeaders: [] (array vuoto: disabilita global)
 * - security: [{}] → hasOverride: true, operationHeaders: [] (oggetto vuoto: no auth required)
 * - security: [{ apiKey: [] }] → hasOverride: true, operationHeaders: [apiKey header]
 * - no security field → hasOverride: false (usa global security)
 */
export function processOperationSecurity(
  operation: OperationObject,
  doc: OpenAPIObject,
): OperationSecurityAnalysis {
  const operationHeaders: SecurityHeader[] = [];
  const analyzedSchemes: AnalyzedSecurityScheme[] = [];
  const hasOverride = operation.security !== undefined;

  if (operation.security && doc.components?.securitySchemes) {
    /* Process operation-specific security schemes */
    for (const securityRequirement of operation.security) {
      for (const schemeName of Object.keys(securityRequirement)) {
        const scheme = doc.components.securitySchemes[
          schemeName
        ] as SecuritySchemeObject;
        if (!scheme) continue;

        const analyzed = analyzeSecurityScheme(schemeName, scheme);
        analyzedSchemes.push(analyzed);

        if (analyzed.isHeaderBased && analyzed.headerName) {
          operationHeaders.push({
            headerName: analyzed.headerName,
            isOverride: true, // From operation.security (override of global security)
            isRequired: true, // Required in params.headers, no fallback to config
            schemeName,
          });
        }
      }
    }
  }

  return {
    analyzedSchemes,
    hasOverride,
    operationHeaders,
  };
}
