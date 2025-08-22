import * as operations from "./generated/operations/index.js";
import { configureOperations, type GlobalConfig } from "./generated/operations/config.js";

/**
 * Test client configuration
 */
export interface TestClientConfig {
  baseURL: string;
  authHeaders?: Record<string, string>;
  customHeaders?: Record<string, string>;
}

/**
 * Create a configured test client from generated operations
 */
export function createTestClient(config: TestClientConfig) {
  const apiConfig: GlobalConfig = {
    baseURL: config.baseURL,
    fetch: fetch,
    headers: {
      "Content-Type": "application/json",
      ...config.customHeaders,
      ...config.authHeaders,
    },
  };

  // Use the configureOperations helper to bind configuration to all operations
  return configureOperations(operations, apiConfig);
}

/**
 * Create authentication headers for different security schemes
 */
export const createAuthHeaders = {
  bearerToken: (token: string) => ({
    Authorization: `Bearer ${token}`,
  }),
  
  bearerTokenHttp: (token: string) => ({
    Authorization: `Bearer ${token}`,
  }),
  
  simpleToken: (token: string) => ({
    "X-Functions-Key": token,
  }),
  
  customToken: (token: string) => ({
    "custom-token": token,
  }),
};

/**
 * Default test tokens for different security schemes
 */
export const defaultTestTokens = {
  bearerToken: "test-bearer-token-123",
  bearerTokenHttp: "test-bearer-http-token-456", 
  simpleToken: "test-simple-token-789",
  customToken: "test-custom-token-abc",
};

/**
 * Helper to create client with specific auth scheme
 */
export function createAuthenticatedClient(baseURL: string, authScheme: keyof typeof defaultTestTokens) {
  const authHeaders = createAuthHeaders[authScheme](defaultTestTokens[authScheme]);
  
  return createTestClient({
    baseURL,
    authHeaders,
  });
}

/**
 * Create client without authentication (for testing no-auth endpoints)
 */
export function createUnauthenticatedClient(baseURL: string) {
  return createTestClient({
    baseURL,
  });
}