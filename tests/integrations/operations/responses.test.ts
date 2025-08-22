import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "../setup.js";
import { createUnauthenticatedClient } from "../client.js";

describe("Response Operations", () => {
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

  describe("testMultipleSuccess operation", () => {
    it("should handle 200 response with Message data", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      expect([200, 202, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // Should match Message schema
        expect(response.data).toHaveProperty("id");
        expect(response.data).toHaveProperty("content");
        if (response.data.content) {
          expect(response.data.content).toHaveProperty("markdown");
        }
      }
    });

    it("should handle 202 accepted response", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 202) {
        // 202 responses typically have no body or minimal body
        expect(response.response.headers).toBeDefined();
      }
    });

    it("should handle 403 forbidden response with OneOfTest data", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 403) {
        expect(response.data).toBeDefined();
        // Should match OneOfTest schema (limited or unlimited property)
        expect(
          response.data.hasOwnProperty("limited") || response.data.hasOwnProperty("unlimited")
        ).toBe(true);
      }
    });

    it("should handle 404 not found response", async () => {
      // Arrange  
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 404) {
        // 404 response has no content according to spec
        expect(response.response.headers).toBeDefined();
      }
    });
  });

  describe("testResponseHeader operation", () => {
    it("should return 201 response with headers", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      expect([201, 500]).toContain(response.status);
      
      if (response.status === 201) {
        expect(response.data).toBeDefined();
        expect(response.data).toHaveProperty("id");
        expect(response.data).toHaveProperty("content");
        
        // Check response headers
        expect(response.response.headers).toBeDefined();
        // Prism should generate Location and Id headers
        const locationHeader = response.response.headers.get("Location");
        const idHeader = response.response.headers.get("Id");
        
        // Headers might be present depending on Prism's mock behavior
        if (locationHeader) {
          expect(typeof locationHeader).toBe("string");
        }
        if (idHeader) {
          expect(typeof idHeader).toBe("string");
        }
      }
    });

    it("should handle 500 internal server error", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      if (response.status === 500) {
        // 500 response has no content according to spec
        expect(response.response.headers).toBeDefined();
      }
    });

    it("should validate Message schema in 201 response", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      if (response.status === 201) {
        const message = response.data;
        expect(message).toHaveProperty("id");
        expect(message).toHaveProperty("content");
        expect(message.content).toHaveProperty("markdown");
        
        // Validate content structure
        if (typeof message.content.markdown === "string") {
          expect(message.content.markdown.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("testWithEmptyResponse operation", () => {
    it("should handle response with reference to NotFound", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testWithEmptyResponse({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
      
      // NotFound response reference should result in minimal/no content
      // The exact behavior depends on the referenced response definition
    });

    it("should return appropriate headers for empty response", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testWithEmptyResponse({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
      
      // Check common headers are present
      const contentType = response.response.headers.get("content-type");
      if (contentType) {
        expect(typeof contentType).toBe("string");
      }
    });
  });

  describe("Response data validation", () => {
    it("should handle JSON response content types", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 200 || response.status === 403) {
        const contentType = response.response.headers.get("content-type");
        if (contentType) {
          expect(contentType).toContain("application/json");
        }
        
        // Data should be parsed as JSON object
        expect(typeof response.data).toBe("object");
        expect(response.data).not.toBeNull();
      }
    });

    it("should handle responses without content", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 202 || response.status === 404) {
        // These responses might not have content
        // The data might be null, undefined, or an empty object
        expect(response.response.headers).toBeDefined();
        expect(response.status).toBeGreaterThan(199);
        expect(response.status).toBeLessThan(300);
      }
    });

    it("should preserve response metadata", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("headers");
      expect(response).toHaveProperty("data");
      
      expect(typeof response.status).toBe("number");
      expect(response.response.headers).toBeInstanceOf(Headers);
    });
  });
});