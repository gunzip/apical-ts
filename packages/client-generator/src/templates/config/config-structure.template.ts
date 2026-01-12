/* Configuration interface and default values */

import type { ConfigStructure } from "../../models/config-models.js";

/*
 * Renders the AuthHeaders type export (if needed)
 */
export function renderAuthHeadersType(config: ConfigStructure): string {
  const { auth } = config;

  if (!auth.hasAuthHeaders) {
    return "";
  }

  return `export type AuthHeaders = ${auth.authHeadersType};`;
}

/*
 * Renders the default configuration object
 */
export function renderConfigImplementation(config: ConfigStructure): string {
  const { server } = config;

  const headersDefault = config.auth.hasAuthHeaders
    ? `{
${config.auth.authHeaders.map((h) => `    '${h}': ''`).join(",\n")}
  }`
    : `{}`;

  return `// Default global configuration - immutable
export const globalConfig: GlobalConfig = {
  baseURL: '${server.defaultBaseURL}',
  fetch: fetch,
  headers: ${headersDefault},
  forceValidation: true
};

/* A minimal, serializable representation of a fetch Response */
export type MinimalResponse = {
  readonly status: number;
  readonly headers: {
    get(name: string): string | null | undefined;
  };
};`;
}

/*
 * Renders the GlobalConfig interface
 */
export function renderConfigInterface(config: ConfigStructure): string {
  const { auth, server } = config;

  const authHeadersType = auth.hasAuthHeaders
    ? `export type AuthHeaders = ${auth.authHeadersType};\n`
    : "";

  return `// Configuration types
${authHeadersType}
export interface GlobalConfig {
  baseURL: ${server.baseURLType};
  fetch: typeof fetch;
    headers: ${auth.hasAuthHeaders ? `{\n    [K in AuthHeaders]: string;\n  }` : "{}"};
  deserializers?: DeserializerMap;
  forceValidation?: boolean;
}`;
}
