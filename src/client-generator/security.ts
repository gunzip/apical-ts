import type {
  OpenAPIObject,
  OperationObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";

import { toValidVariableName } from "./utils.js";

/**
 * Security header information for operations
 */
export type SecurityHeader = {
  headerName: string;
  isRequired: boolean;
  schemeName: string;
};

/**
 * Extracts global auth header names from security schemes (only those used globally)
 */
export function extractAuthHeaders(doc: OpenAPIObject): string[] {
  const authHeaders: string[] = [];

  // Only include headers from global security schemes
  if (doc.security && doc.components?.securitySchemes) {
    const globalSecuritySchemes = new Set<string>();

    // Collect all globally required security schemes
    for (const securityRequirement of doc.security) {
      for (const schemeName of Object.keys(securityRequirement)) {
        globalSecuritySchemes.add(schemeName);
      }
    }

    // Map global security schemes to their headers
    for (const [name, scheme] of Object.entries(
      doc.components.securitySchemes,
    )) {
      if (globalSecuritySchemes.has(name)) {
        const securityScheme = scheme as SecuritySchemeObject;
        if (
          securityScheme.type === "apiKey" &&
          securityScheme.in === "header" &&
          securityScheme.name
        ) {
          authHeaders.push(securityScheme.name);
        } else if (
          securityScheme.type === "http" &&
          securityScheme.scheme === "bearer"
        ) {
          authHeaders.push("Authorization");
        }
      }
    }
  }

  return [...new Set(authHeaders)]; // Remove duplicates
}

/**
 * Generates security header handling code from params
 */
export function generateSecurityHeaderHandling(
  operationSecurityHeaders: SecurityHeader[],
): string {
  if (operationSecurityHeaders.length === 0) return "";

  return operationSecurityHeaders
    .map((securityHeader) => {
      const varName = toValidVariableName(securityHeader.headerName);
      if (securityHeader.isRequired) {
        return `finalHeaders['${securityHeader.headerName}'] = ${varName};`;
      } else {
        return `if (${varName} !== undefined) finalHeaders['${securityHeader.headerName}'] = ${varName};`;
      }
    })
    .join("\n    ");
}

/**
 * Gets operation-specific security schemes that are not global
 */
export function getOperationSecuritySchemes(
  operation: OperationObject,
  doc: OpenAPIObject,
): SecurityHeader[] {
  const operationSecurityHeaders: SecurityHeader[] = [];

  if (!operation.security || !doc.components?.securitySchemes) {
    return operationSecurityHeaders;
  }

  // Process operation-specific security schemes
  for (const securityRequirement of operation.security) {
    for (const schemeName of Object.keys(securityRequirement)) {
      const scheme = doc.components.securitySchemes[
        schemeName
      ] as SecuritySchemeObject;
      if (!scheme) continue;

      let headerName: null | string = null;

      if (scheme.type === "apiKey" && scheme.in === "header" && scheme.name) {
        headerName = scheme.name;
      } else if (scheme.type === "http" && scheme.scheme === "bearer") {
        headerName = "Authorization";
      }

      if (headerName) {
        operationSecurityHeaders.push({
          headerName,
          isRequired: true, // Operation-specific security is always required
          schemeName,
        });
      }
    }
  }

  return operationSecurityHeaders;
}

/**
 * Checks if an operation overrides global security (either empty or with specific schemes)
 */
export function hasSecurityOverride(operation: OperationObject): boolean {
  return operation.security !== undefined;
}
