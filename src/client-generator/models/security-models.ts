import type { SecuritySchemeObject } from "openapi3-ts/oas31";

/* Security-related data structures and type definitions */

/**
 * Security header information for operations
 */
export type SecurityHeader = {
  headerName: string;
  isRequired: boolean;
  schemeName: string;
};

/**
 * Analyzed security scheme information
 */
export type AnalyzedSecurityScheme = {
  schemeName: string;
  scheme: SecuritySchemeObject;
  headerName: string | null;
  isHeaderBased: boolean;
};

/**
 * Security analysis result for global schemes
 */
export type GlobalSecurityAnalysis = {
  globalSchemeNames: Set<string>;
  authHeaders: string[];
  analyzedSchemes: AnalyzedSecurityScheme[];
};

/**
 * Security analysis result for operation-specific schemes
 */
export type OperationSecurityAnalysis = {
  operationHeaders: SecurityHeader[];
  hasOverride: boolean;
  analyzedSchemes: AnalyzedSecurityScheme[];
};

/**
 * Auth header requirements analysis
 */
export type AuthHeaderRequirements = {
  globalHeaders: string[];
  operationHeaders: SecurityHeader[];
  requiresAuthentication: boolean;
};