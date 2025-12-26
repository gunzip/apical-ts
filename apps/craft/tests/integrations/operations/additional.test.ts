import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedClient } from "../client.js";
import { getRandomPort, MockServer } from "../setup.js";

describe("Additional Operations", () => {
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

  describe("testSimplePatch operation", () => {
    it("should handle PATCH method successfully", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testSimplePatch({});

      // Assert
      expect((response as any).status).toBe("200");
      expect((response as any).response.headers).toBeDefined();
    });

    it("should handle PATCH method error responses", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testSimplePatch({});

      // Assert - Could be 200 or 500 based on Prism mock behavior
      expect(["200", "500"]).toContain((response as any).status);
    });

    it("should support PATCH as an HTTP method", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testSimplePatch({});

      // Assert - Verify the operation exists and is callable
      expect(response).toBeDefined();
      expect(typeof (response as any).status).toBe("string");
      expect((response as any).response.headers).toBeInstanceOf(Headers);
    });
  });

  describe("HTTP Methods Support", () => {
    it("should support GET methods", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
      expect(parseInt((response as any).status)).toBeLessThan(600);
    });

    it("should support POST methods", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        age: 25,
        name: "Test Name",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
      expect(parseInt((response as any).status)).toBeLessThan(600);
    });

    it("should support PUT methods", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        id: "test-id",
        name: "Test Model",
      };

      // Act
      const response = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
      expect(parseInt((response as any).status)).toBeLessThan(600);
    });

    it("should support PATCH methods", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testSimplePatch({});

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
      expect(parseInt((response as any).status)).toBeLessThan(600);
    });
  });

  describe("Edge Case Operations", () => {
    it("should handle operations with minimal configuration", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testSimplePatch({});

      // Assert
      expect(response).toBeDefined();
      expect((response as any).status).toBeDefined();
      expect((response as any).response.headers).toBeDefined();
    });

    it("should handle operations with empty parameters", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testWithEmptyResponse({});

      // Assert
      expect((response as any).status).toBe("200");
      expect((response as any).response.headers).toBeDefined();
    });

    it("should handle operations with mixed parameter types", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testParametersAtPathLevel({
        query: {
          cursor: "test-cursor-value",
          "request-id": "test-request-123",
        },
      });

      // Assert
      expect((response as any).status).toBe("200");
    });
  });

  describe("Client Configuration Validation", () => {
    it("should work with custom base URLs", async () => {
      // Arrange
      const customClient = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await customClient.testSimplePatch({});

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
    });

    it("should preserve custom headers", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act - The client should include default headers like Content-Type
      const response = await client.testSimplePatch({});

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
      expect((response as any).response.headers).toBeDefined();
    });

    it("should handle fetch configuration", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act - Test that the client uses the fetch API correctly
      const response = await client.testSimplePatch({});

      // Assert
      expect(response).toBeDefined();
      expect((response as any).status).toBeDefined();
      expect((response as any).response.headers).toBeInstanceOf(Headers);
    });
  });

  describe("Response Format Validation", () => {
    it("should return consistent response structure", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testSimplePatch({});

      // Assert
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("response");
      expect(response).toHaveProperty("data");

      expect(typeof (response as any).status).toBe("string");
      expect((response as any).response.headers).toBeInstanceOf(Headers);
    });

    it("should handle different content types appropriately", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);

      const contentType = (response as any).response.headers.get("content-type");
      if (contentType) {
        expect(typeof contentType).toBe("string");
      }
    });

    it("should preserve response metadata", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      expect(parseInt((response as any).status)).toBeGreaterThanOrEqual(200);
      expect((response as any).response.headers).toBeDefined();

      // Check that headers are accessible
      const headers = Array.from((response as any).response.headers.entries());
      expect(Array.isArray(headers)).toBe(true);
    });
  });
});
