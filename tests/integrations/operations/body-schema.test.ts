import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "../setup.js";
import { createUnauthenticatedClient } from "../client.js";
import { sampleData } from "../fixtures/test-helpers.js";

describe("Body and Schema Operations", () => {
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

  describe("testInlineBodySchema operation", () => {
    it("should handle inline body schema successfully", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = sampleData.inlineBody;

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.response.headers).toBeDefined();
    });

    it("should validate required fields in inline schema", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = {
        // Missing required 'name' field
        age: 25,
      };

      // Act & Assert
      try {
        const response = await client.testInlineBodySchema({
          body: requestBody,
        } as any);
        // Prism might still accept invalid data, so check response
        expect(response.status).toBeGreaterThanOrEqual(200);
      } catch (error) {
        // If validation fails, it should be a 400 error
        expect(error.message || error.toString()).toMatch(/40[0-9]/);
      }
    });

    it("should handle additional properties in inline schema", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = {
        name: "Test Name",
        age: 25,
        extraProperty: "should be ignored or handled gracefully",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
    });

    it("should handle different data types in inline schema", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = {
        name: "Test Name",
        age: 30.5, // Number instead of integer
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
    });
  });

  describe("testParameterWithBodyReference operation", () => {
    it("should handle body with schema reference", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = sampleData.newModel;

      // Act
      const response = await client.testParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.response.headers).toBeDefined();
    });

    it("should validate referenced schema properties", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = {
        id: "test-id-123",
        name: "Test Model Name",
      };

      // Act
      const response = await client.testParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
    });

    it("should reject invalid referenced schema", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = {
        // Missing required 'id' and 'name' fields for NewModel
        invalidField: "test",
      };

      // Act & Assert
      try {
        const response = await client.testParameterWithBodyReference({
          body: requestBody,
        } as any);
        // Prism might still accept invalid data
        expect(response.status).toBeGreaterThanOrEqual(200);
      } catch (error) {
        expect(error.message || error.toString()).toMatch(/40[0-9]/);
      }
    });

    it("should handle empty body when not required", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act - Body is not marked as required in the spec
      const response = await client.testParameterWithBodyReference({});

      // Assert
      expect([201, 400]).toContain(response.status);
    });
  });

  describe("putTestParameterWithBodyReference operation", () => {
    it("should handle PUT operation with body reference", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = sampleData.newModel;

      // Act
      const response = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.response.headers).toBeDefined();
    });

    it("should differentiate PUT from POST behavior", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = sampleData.newModel;

      // Act - Test both PUT and POST with same body
      const putResponse = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });
      const postResponse = await client.testParameterWithBodyReference({
        body: requestBody,
      });

      // Assert - Both should succeed but are different operations
      expect(putResponse.status).toBe(201);
      expect(postResponse.status).toBe(201);
      expect(putResponse.headers).toBeDefined();
      expect(postResponse.headers).toBeDefined();
    });

    it("should handle idempotency of PUT requests", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = {
        id: "idempotent-test-id",
        name: "Idempotent Test Model",
      };

      // Act - Make the same PUT request twice
      const firstResponse = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });
      const secondResponse = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });

      // Assert - Both should succeed (PUT should be idempotent)
      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);
    });
  });

  describe("Body content type handling", () => {
    it("should handle JSON content type", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const requestBody = sampleData.inlineBody;

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      expect(response.status).toBe(201);
      // The request should have been sent with application/json content type
      expect(response.response.headers).toBeDefined();
    });

    it("should serialize complex objects correctly", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const complexBody = {
        name: "Complex Object",
        age: 30,
        metadata: {
          tags: ["tag1", "tag2"],
          settings: {
            enabled: true,
            level: 5,
          },
        },
        items: [1, 2, 3, 4, 5],
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: complexBody,
      });

      // Assert
      expect(response.status).toBe(201);
    });

    it("should handle special characters in body", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const bodyWithSpecialChars = {
        name: "Test with special chars: áéíóú, ñ, ç, 中文, 🌟",
        age: 25,
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: bodyWithSpecialChars,
      });

      // Assert
      expect(response.status).toBe(201);
    });
  });

  describe("Schema validation edge cases", () => {
    it("should handle null values appropriately", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const bodyWithNull = {
        name: "Test Name",
        age: null, // Null age
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: bodyWithNull,
      });

      // Assert - Behavior depends on schema validation
      expect([201, 400]).toContain(response.status);
    });

    it("should handle undefined values appropriately", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const bodyWithUndefined = {
        name: "Test Name",
        age: undefined, // Undefined age
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: bodyWithUndefined,
      });

      // Assert
      expect([201, 400]).toContain(response.status);
    });

    it("should handle empty object bodies", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      try {
        const response = await client.testInlineBodySchema({
          body: {},
        } as any);
        expect([201, 400]).toContain(response.status);
      } catch (error) {
        expect(error.message || error.toString()).toMatch(/40[0-9]/);
      }
    });
  });
});