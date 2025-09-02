import type { SecuritySchemeObject } from "openapi3-ts/oas31";

/* Security-related data structures and type definitions */

/**
 * Analyzed security scheme information
 */
export interface AnalyzedSecurityScheme {
  headerName: null | string;
  isHeaderBased: boolean;
  scheme: SecuritySchemeObject;
  schemeName: string;
}

/**
 * Auth header requirements analysis
 */
export interface AuthHeaderRequirements {
  globalHeaders: string[];
  operationHeaders: SecurityHeader[];
  requiresAuthentication: boolean;
}

/**
 * Security analysis result for global schemes
 */
export interface GlobalSecurityAnalysis {
  analyzedSchemes: AnalyzedSecurityScheme[];
  authHeaders: string[];
  globalSchemeNames: Set<string>;
}

/**
 * Security analysis result for operation-specific schemes
 */
export interface OperationSecurityAnalysis {
  analyzedSchemes: AnalyzedSecurityScheme[];
  hasOverride: boolean;
  operationHeaders: SecurityHeader[];
}

/**
 * Security header information for operations
 */
export interface SecurityHeader {
  headerName: string;
  isRequired: boolean;
  schemeName: string;
}
