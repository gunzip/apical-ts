/* Configuration data structures and types */

/*
 * Represents the analysis result of authentication configuration
 */
export type AuthConfiguration = {
  /* List of auth header names extracted from OpenAPI spec */
  authHeaders: string[];
  /* TypeScript union type string for auth headers (e.g., "'authorization' | 'x-api-key'") */
  authHeadersType: string;
  /* Whether any auth headers were found */
  hasAuthHeaders: boolean;
};

/*
 * Represents the analysis result of server configuration
 */
export type ServerConfiguration = {
  /* List of server URLs from OpenAPI spec */
  serverUrls: string[];
  /* TypeScript union type string for baseURL (includes server URLs + string extension) */
  baseURLType: string;
  /* Default baseURL value to use in configuration object */
  defaultBaseURL: string;
  /* Whether any server URLs were found */
  hasServerUrls: boolean;
};

/*
 * Represents the complete configuration structure needed for code generation
 */
export type ConfigStructure = {
  /* Authentication configuration details */
  auth: AuthConfiguration;
  /* Server configuration details */
  server: ServerConfiguration;
};

/*
 * Configuration for template rendering
 */
export type ConfigTemplateOptions = {
  /* Whether to include the full static support code */
  includeStaticSupport?: boolean;
  /* Whether to include type exports */
  includeTypeExports?: boolean;
  /* Whether to include default configuration object */
  includeDefaultConfig?: boolean;
};