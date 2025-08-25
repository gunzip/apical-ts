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

import { renderSecurityHeaderHandling } from "./templates/security-templates.js";

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

/*
 * Legacy API compatibility functions - maintain existing public API
 */

/**
 * Generates security header handling code from params
 * @deprecated Use renderSecurityHeaderHandling from templates/security-templates.ts
 */
export function generateSecurityHeaderHandling(
  operationSecurityHeaders: SecurityHeader[],
): string {
  return renderSecurityHeaderHandling(operationSecurityHeaders);
}

/**
 * Gets operation-specific security schemes that are not global
 */
export function getOperationSecuritySchemes(
  operation: OperationObject,
  doc: OpenAPIObject,
): SecurityHeader[] {
  const analysis = processOperationSecurity(operation, doc);
  return analysis.operationHeaders;
}

/**
 * Checks if an operation overrides global security (either empty or with specific schemes)
 */
export function hasSecurityOverride(operation: OperationObject): boolean {
  return operation.security !== undefined;
}

/**
 * Processes operation-specific security requirements
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
            isRequired: true, // Operation-specific security is always required
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

/*
 * Re-export types for backward compatibility
 */
export type { SecurityHeader } from "./models/security-models.js";
