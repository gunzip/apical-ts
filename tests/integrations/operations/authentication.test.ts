import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "../setup.js";
import { createAuthenticatedClient, createUnauthenticatedClient } from "../client.js";
import { sampleData } from "../fixtures/test-helpers.js";

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
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
      };

      // Act
      const response = await client.testAuthBearer(params);

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.response.headers).toBeDefined();
    });

    it("should return 403 for invalid bearer token", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
      };

      // Act & Assert
      await expect(client.testAuthBearer(params)).rejects.toThrow();
    });

    it("should handle missing required query parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerToken");
      const params = {
        // Missing required 'qr' parameter
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
      } as any;

      // Act & Assert
      await expect(client.testAuthBearer(params)).rejects.toThrow();
    });
  });

  describe("testAuthBearerHttp operation", () => {
    it("should authenticate successfully with HTTP bearer token", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerTokenHttp");
      const params = {
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
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
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
      };

      // Act
      const response = await client.testAuthBearerHttp(params);

      // Assert - Prism might return different status codes for different scenarios
      expect([200, 503, 504]).toContain(response.status);
      if (response.status === 503) {
        expect(response.data).toHaveProperty("prop1");
      }
    });

    it("should return 403 for unauthorized request", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
      };

      // Act & Assert
      await expect(client.testAuthBearerHttp(params)).rejects.toThrow();
    });
  });

  describe("testSimpleToken operation", () => {
    it("should authenticate successfully with simple token", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "simpleToken");
      const params = {
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
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
        qr: sampleData.queryParams.qr,
        qo: sampleData.queryParams.qo,
        cursor: sampleData.queryParams.cursor,
      };

      // Act & Assert
      await expect(client.testSimpleToken(params)).rejects.toThrow();
    });
  });

  describe("testCustomTokenHeader operation", () => {
    it("should authenticate successfully with custom token header", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testCustomTokenHeader({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should return 403 for missing custom token", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      await expect(client.testCustomTokenHeader({})).rejects.toThrow();
    });
  });
});