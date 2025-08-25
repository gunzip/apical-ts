/* Generates the configuration file content and types */

import type {
  AuthConfiguration,
  ConfigStructure,
  ServerConfiguration,
} from "./models/config-models.js";

import {
  renderAuthHeadersType,
  renderConfigImplementation,
  renderConfigInterface,
  renderConfigSupport,
} from "./templates/config-templates.js";

/*
 * Analyzes authentication configuration from auth headers
 */
export function analyzeAuthConfiguration(
  authHeaders: string[],
): AuthConfiguration {
  const hasAuthHeaders = authHeaders.length > 0;
  const authHeadersType = hasAuthHeaders
    ? authHeaders.map((h) => `'${h}'`).join(" | ")
    : "string";

  return {
    authHeaders,
    authHeadersType,
    hasAuthHeaders,
  };
}

/*
 * Analyzes server configuration from server URLs
 */
export function analyzeServerConfiguration(
  serverUrls: string[] = [],
): ServerConfiguration {
  const hasServerUrls = serverUrls.length > 0;
  const baseURLType = hasServerUrls
    ? serverUrls.map((url) => `'${url}'`).join(" | ") + " | (string & {})"
    : "string";
  const defaultBaseURL = hasServerUrls ? serverUrls[0] : "";

  return {
    baseURLType,
    defaultBaseURL,
    hasServerUrls,
    serverUrls,
  };
}

/*
 * Determines the complete configuration structure
 */
export function determineConfigStructure(
  authHeaders: string[],
  serverUrls: string[] = [],
): ConfigStructure {
  return {
    auth: analyzeAuthConfiguration(authHeaders),
    server: analyzeServerConfiguration(serverUrls),
  };
}

/* Generates the configuration file content */
export function generateConfigFileContent(
  authHeaders: string[],
  serverUrls: string[] = [],
): string {
  return generateConfigTypes(authHeaders, serverUrls);
}

/* Generate configuration types */
export function generateConfigTypes(
  authHeaders: string[],
  serverUrls: string[] = [],
): string {
  const config = determineConfigStructure(authHeaders, serverUrls);

  const parts = [
    renderConfigInterface(config),
    "",
    renderAuthHeadersType(config),
    "",
    renderConfigImplementation(config),
    renderConfigSupport(),
  ];

  /* Filter out empty parts and join */
  return parts.filter((part) => part.trim() !== "").join("\n");
}
