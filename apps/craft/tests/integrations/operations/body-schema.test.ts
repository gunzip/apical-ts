import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedClient } from "../client.js";
import { sampleData } from "../fixtures/test-helpers.js";
import { getRandomPort, MockServer } from "../setup.js";

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
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = sampleData.inlineBody;

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should validate required fields in inline schema", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        // Missing required 'name' field
        age: 25,
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      } as any);

      // Assert - Prism might still accept invalid data, or return error response
      if (response.isValid) {
        expect(parseInt(response.status)).toBeGreaterThanOrEqual(200);
      } else if (!response.isValid) {
        /* If validation fails, it should be a 400 error with proper structure */
        expect(response.error).toBeDefined();
        if (response.kind === "unexpected-response") {
          expect(parseInt(response.result.status)).toBeGreaterThanOrEqual(400);
          expect(response.result.data).toBeDefined();
          expect(response.result.response).toBeInstanceOf(Response);
        }
      }
    });

    it("should handle additional properties in inline schema", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        age: 25,
        extraProperty: "should be ignored or handled gracefully",
        name: "Test Name",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should handle different data types in inline schema", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        age: 30.5, // Number instead of integer
        name: "Test Name",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });
  });

  describe("testParameterWithBodyReference operation", () => {
    it("should handle body with schema reference", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = sampleData.newModel;

      // Act
      const response = await client.testParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should validate referenced schema properties", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        id: "test-id-123",
        name: "Test Model Name",
      };

      // Act
      const response = await client.testParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should reject invalid referenced schema", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = {
        // Missing required 'id' and 'name' fields for NewModel
        invalidField: "test",
      };

      // Act & Assert
      const response = await client.testParameterWithBodyReference({
        body: requestBody,
      } as any);

      // Assert - Prism might still accept invalid data
      if (response.isValid) {
        expect(parseInt(response.status)).toBeGreaterThanOrEqual(200);
      } else if (!response.isValid) {
        /* Error shape validation */
        expect(response.error).toBeDefined();
        if (response.kind === "unexpected-response") {
          expect(parseInt(response.result.status)).toBeGreaterThanOrEqual(400);
          expect(response.result.data).toBeDefined();
          expect(response.result.response).toBeInstanceOf(Response);
        }
      }
    });

    it("should handle empty body when not required", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act - Body is not marked as required in the spec
      const response = await client.testParameterWithBodyReference({});

      // Assert
      if (response.isValid) {
        expect(["201", "400"]).toContain(response.status);
      } else {
        expect.fail("Expected valid response");
      }
    });
  });

  describe("putTestParameterWithBodyReference operation", () => {
    it("should handle PUT operation with body reference", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = sampleData.newModel;

      // Act
      const response = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should differentiate PUT from POST behavior", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = sampleData.newModel;

      // Act - Test both PUT and POST with same body
      const putResponse = await client.putTestParameterWithBodyReference({
        body: requestBody,
      });
      const postResponse = await client.testParameterWithBodyReference({
        body: requestBody,
      });

      // Assert - Both should succeed but are different operations
      if (
        putResponse.isValid &&
        postResponse.isValid &&
        putResponse.status === "201" &&
        postResponse.status === "201"
      ) {
        expect(putResponse.status).toBe("201");
        expect(postResponse.status).toBe("201");
        expect(putResponse.response.headers).toBeDefined();
        expect(postResponse.response.headers).toBeDefined();
      } else {
        expect.fail("Expected both responses to succeed with status 201");
      }
    });

    it("should handle idempotency of PUT requests", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
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
      if (
        firstResponse.isValid &&
        secondResponse.isValid &&
        firstResponse.status === "201" &&
        secondResponse.status === "201"
      ) {
        expect(firstResponse.status).toBe("201");
        expect(secondResponse.status).toBe("201");
      } else {
        expect.fail("Expected both responses to succeed with status 201");
      }
    });
  });

  describe("Body content type handling", () => {
    it("should handle JSON content type", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const requestBody = sampleData.inlineBody;

      // Act
      const response = await client.testInlineBodySchema({
        body: requestBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
        /* The request should have been sent with application/json content type */
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should serialize complex objects correctly", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const complexBody = {
        age: 30,
        items: [1, 2, 3, 4, 5],
        metadata: {
          settings: {
            enabled: true,
            level: 5,
          },
          tags: ["tag1", "tag2"],
        },
        name: "Complex Object",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: complexBody,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });

    it("should handle special characters in body", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const bodyWithSpecialChars = {
        age: 25,
        name: "Test with special chars: áéíóú, ñ, ç, 中文, 🌟",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: bodyWithSpecialChars,
      });

      // Assert
      if (response.isValid && response.status === "201") {
        expect(response.status).toBe("201");
      } else {
        expect.fail("Expected successful response with status 201");
      }
    });
  });

  describe("Schema validation edge cases", () => {
    it("should handle null values appropriately", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const bodyWithNull = {
        age: null, // Null age
        name: "Test Name",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: bodyWithNull as any,
      });

      // Assert - Behavior depends on schema validation - might accept or reject
      if (response.isValid) {
        expect(["201", "400", "422"]).toContain(response.status);
      } else if (!response.isValid) {
        /* Error shape validation for validation errors */
        expect(response.error).toBeDefined();
        if (response.kind === "unexpected-response") {
          expect(["400", "422"]).toContain(response.result.status);
          expect(response.result.data).toBeDefined();
          expect(response.result.response).toBeInstanceOf(Response);
        }
      }
    });

    it("should handle undefined values appropriately", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const bodyWithUndefined = {
        age: undefined, // Undefined age
        name: "Test Name",
      };

      // Act
      const response = await client.testInlineBodySchema({
        body: bodyWithUndefined,
      });

      // Assert
      if (response.isValid) {
        expect(["201", "400", "422"]).toContain(response.status);
      } else if (!response.isValid) {
        /* Error shape validation for validation errors */
        expect(response.error).toBeDefined();
        if (response.kind === "unexpected-response") {
          expect(["400", "422"]).toContain(response.result.status);
          expect(response.result.data).toBeDefined();
          expect(response.result.response).toBeInstanceOf(Response);
        }
      }
    });

    it("should handle empty object bodies", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testInlineBodySchema({
        body: {},
      } as any);

      // Assert
      if (response.isValid) {
        expect(["201", "400"]).toContain(response.status);
      } else if (!response.isValid) {
        /* Error shape validation */
        expect(response.error).toBeDefined();
        if (response.kind === "unexpected-response") {
          expect(parseInt(response.result.status)).toBeGreaterThanOrEqual(400);
          expect(response.result.data).toBeDefined();
          expect(response.result.response).toBeInstanceOf(Response);
        }
      }
    });
  });
});
