import {
  configureOperations,
  type GlobalConfig,
} from "./generated/client/config";
import * as operations from "./generated/client";

/**
 * Test client configuration
 */
export interface TestClientConfig {
  authHeaders?: Record<string, string>;
  baseURL: string;
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

  customToken: (token: string) => ({
    "custom-token": token,
  }),

  simpleToken: (token: string) => ({
    "X-Functions-Key": token,
  }),
};

/**
 * Default test tokens for different security schemes
 */
export const defaultTestTokens = {
  bearerToken: "test-bearer-token-123",
  bearerTokenHttp: "test-bearer-http-token-456",
  customToken: "test-custom-token-abc",
  simpleToken: "test-simple-token-789",
};

/**
 * Helper to create client with specific auth scheme
 */
export function createAuthenticatedClient(
  baseURL: string,
  authScheme: keyof typeof defaultTestTokens,
) {
  const authHeaders = createAuthHeaders[authScheme](
    defaultTestTokens[authScheme],
  );

  return createTestClient({
    authHeaders,
    baseURL,
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
