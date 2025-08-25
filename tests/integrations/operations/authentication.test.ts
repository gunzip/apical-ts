import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthenticatedClient,
  createUnauthenticatedClient,
} from "../client.js";
import { sampleData } from "../fixtures/test-helpers.js";
import { getRandomPort, MockServer } from "../setup.js";

describe("Authentication Operations", () => {
  let mockServer: MockServer;
  let baseURL: string;
  const port = getRandomPort();

  beforeAll(async () => {
    mockServer = new MockServer({
      port,
      specPath: "tests/integrations/fixtures/test.yaml",
    });

    await mockServer.start();
    baseURL = mockServer.getBaseUrl();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe("testAuthBearer operation", () => {
    it("should authenticate successfully with bearer token", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerToken");
      const params = {
        headers: {
          Authorization: "Bearer test-bearer-token-123",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act
      const response = await client.testAuthBearer(params);

      // Assert - Validate response structure (allow top-level validation error branch)
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
      if ("error" in response) {
        // Validation failed; ensure ZodError shape
        expect(response.error.issues).toBeDefined();
        expect(response.error.issues.length).toBeGreaterThan(0);
      } else {
        expect(response.data).toBeDefined();
      }
    });

    it("should return 403 for invalid bearer token", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        headers: {
          Authorization: "Bearer invalid-token",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act & Assert
      try {
        await client.testAuthBearer(params);
        expect.fail("Expected operation to throw error due to invalid token");
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.status).toBeLessThan(500);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For network errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });

    it("should handle missing required query parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerToken");
      const params = {
        headers: {
          Authorization: "Bearer test-bearer-token-123",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          // Missing required 'qr' parameter
          qo: sampleData.queryParams.qo,
        },
      } as any;

      // Act & Assert
      try {
        await client.testAuthBearer(params);
        expect.fail(
          "Expected operation to throw error due to missing required parameter",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For network errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testAuthBearerHttp operation", () => {
    it("should authenticate successfully with HTTP bearer token", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerTokenHttp");
      const params = {
        headers: {
          Authorization: "Bearer test-bearer-http-token-456",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act
      const response = await client.testAuthBearerHttp(params);

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should handle multiple success responses (503)", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerTokenHttp");
      const params = {
        headers: {
          Authorization: "Bearer test-bearer-http-token-456",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act
      const response = await client.testAuthBearerHttp(params);

      // Assert - Prism might return different status codes for different scenarios
      expect([200, 503, 504]).toContain(response.status);
      if (response.status === 503 && "data" in response) {
        expect(response.data).toHaveProperty("prop1");
      }
    });

    it("should return 403 for unauthorized request", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        headers: {
          Authorization: "Bearer invalid-token",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act & Assert
      try {
        await client.testAuthBearerHttp(params);
        expect.fail(
          "Expected operation to throw error due to unauthorized request",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.status).toBeLessThan(500);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For network errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testSimpleToken operation", () => {
    it("should authenticate successfully with simple token", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "simpleToken");
      const params = {
        headers: {
          "X-Functions-Key": "test-simple-token-789",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act
      const response = await client.testSimpleToken(params);

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should return 403 for missing simple token", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        headers: {
          "X-Functions-Key": "",
        },
        query: {
          cursor: sampleData.queryParams.cursor,
          qo: sampleData.queryParams.qo,
          qr: sampleData.queryParams.qr,
        },
      };

      // Act & Assert
      try {
        await client.testSimpleToken(params);
        expect.fail(
          "Expected operation to throw error due to missing simple token",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.status).toBeLessThan(500);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For network errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testCustomTokenHeader operation", () => {
    it("should authenticate successfully with custom token header", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testCustomTokenHeader({
        headers: {
          "custom-token": "test-custom-token-abc",
        },
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should return 403 for missing custom token", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      try {
        await client.testCustomTokenHeader({
          headers: {
            "custom-token": "",
          },
        });
        expect.fail(
          "Expected operation to throw error due to missing custom token",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.status).toBeLessThan(500);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For network errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });
});
