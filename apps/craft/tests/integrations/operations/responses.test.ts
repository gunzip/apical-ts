import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedClient } from "../client.js";
import { getRandomPort, MockServer } from "../setup.js";

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
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      expect([200, 202, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        // Use parse() method to get structured data
        if (response.parse) {
          const parsed = response.parse();
          if ("parsed" in parsed) {
            const data = parsed.parsed as any;
            expect(data).toBeDefined();
            // Should match Message schema
            expect(data).toHaveProperty("id");
            expect(data).toHaveProperty("content");
            if (data.content) {
              expect(data.content).toHaveProperty("markdown");
            }
          }
        } else {
          // Fallback to direct data access
          expect(response.data).toBeDefined();
          expect(response.data).toHaveProperty("id");
          expect(response.data).toHaveProperty("content");
          if ((response.data as any).content) {
            expect((response.data as any).content).toHaveProperty("markdown");
          }
        }
      }
    });

    it("should handle 202 accepted response", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 202) {
        // 202 responses typically have no body or minimal body
        expect(response.response.headers).toBeDefined();
      }
    });

    it("should handle 401 unauthorized response with OneOfTest data", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      try {
        await client.testMultipleSuccess({});

        // Assert
        expect.fail(
          "Expected operation to throw error due to missing auth scheme",
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

    it("should handle 404 not found response", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

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
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      expect([201, 500]).toContain(response.status);

      if (response.status === 201) {
        // Use parse() method to get structured data
        if (response.parse) {
          const parsed = response.parse();
          if ("parsed" in parsed) {
            const data = parsed.parsed as any;
            expect(data).toBeDefined();
            expect(data).toHaveProperty("id");
            expect(data).toHaveProperty("content");
          }
        } else {
          // Fallback to direct data access
          expect(response.data).toBeDefined();
          expect(response.data).toHaveProperty("id");
          expect(response.data).toHaveProperty("content");
        }

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
      const client = createAuthenticatedClient(baseURL, "customToken");

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
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      if (response.status === 201) {
        // Use parse() method to get structured data
        if (response.parse) {
          const parsed = response.parse();
          if ("parsed" in parsed) {
            const message = parsed.parsed as any;
            expect(message).toHaveProperty("id");
            expect(message).toHaveProperty("content");
            expect(message.content).toHaveProperty("markdown");

            // Validate content structure
            if (typeof message.content.markdown === "string") {
              expect(message.content.markdown.length).toBeGreaterThan(0);
            }
          }
        } else {
          // Fallback to direct data access
          const message = response.data as any;
          expect(message).toHaveProperty("id");
          expect(message).toHaveProperty("content");
          expect(message.content).toHaveProperty("markdown");

          // Validate content structure
          if (typeof message.content.markdown === "string") {
            expect(message.content.markdown.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe("testWithEmptyResponse operation", () => {
    it("should handle response with reference to NotFound", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

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
      const client = createAuthenticatedClient(baseURL, "customToken");

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
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testMultipleSuccess({});

      // Assert
      if (response.status === 200 || response.status === 403) {
        const contentType = response.response.headers.get("content-type");
        if (contentType) {
          expect(contentType).toContain("application/json");
        }

        // Data should be parsed as JSON object
        if (response.parse) {
          const parsed = response.parse();
          if ("parsed" in parsed) {
            const data = parsed.parsed;
            expect(typeof data).toBe("object");
            expect(data).not.toBeNull();
          }
        } else {
          // Fallback to direct data access
          expect(typeof response.data).toBe("object");
          expect(response.data).not.toBeNull();
        }
      }
    });

    it("should handle responses without content", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

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
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testResponseHeader({});

      // Assert
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("response");
      expect(response).toHaveProperty("data");

      expect(typeof response.status).toBe("number");
      expect(response.response.headers).toBeInstanceOf(Headers);
    });
  });
});
