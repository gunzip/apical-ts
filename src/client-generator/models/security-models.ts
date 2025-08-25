import type { SecuritySchemeObject } from "openapi3-ts/oas31";

/* Security-related data structures and type definitions */

/**
 * Analyzed security scheme information
 */
export type AnalyzedSecurityScheme = {
  headerName: null | string;
  isHeaderBased: boolean;
  scheme: SecuritySchemeObject;
  schemeName: string;
};

/**
 * Auth header requirements analysis
 */
export type AuthHeaderRequirements = {
  globalHeaders: string[];
  operationHeaders: SecurityHeader[];
  requiresAuthentication: boolean;
};

/**
 * Security analysis result for global schemes
 */
export type GlobalSecurityAnalysis = {
  analyzedSchemes: AnalyzedSecurityScheme[];
  authHeaders: string[];
  globalSchemeNames: Set<string>;
};

/**
 * Security analysis result for operation-specific schemes
 */
export type OperationSecurityAnalysis = {
  analyzedSchemes: AnalyzedSecurityScheme[];
  hasOverride: boolean;
  operationHeaders: SecurityHeader[];
};

/**
 * Security header information for operations
 */
export type SecurityHeader = {
  headerName: string;
  isRequired: boolean;
  schemeName: string;
};
