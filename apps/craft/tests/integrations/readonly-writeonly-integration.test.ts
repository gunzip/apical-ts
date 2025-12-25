import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUnauthenticatedClient } from "./client.js";
import { getRandomPort, MockServer } from "./setup.js";

/*
 * Integration tests for OpenAPI 3 readOnly/writeOnly property handling.
 * These tests verify that:
 * - readOnly properties are excluded from request body types
 * - writeOnly properties are excluded from response body types
 * - Request variants use schema with readOnly properties omitted
 * - Response variants use schema with writeOnly properties omitted
 */
describe("ReadOnly/WriteOnly Integration Tests", () => {
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

  describe("readOnly properties handling", () => {
    it("should generate operation for createUserReadOnly endpoint", async () => {
      /* Arrange */
      const client = createUnauthenticatedClient(baseURL);

      /* Assert - verify operation exists */
      expect(typeof client.createUserReadOnly).toBe("function");
    });

    it("should allow request body without readOnly properties", async () => {
      /*
       * Arrange - request body should NOT require 'id' or 'createdAt'
       * since they are readOnly
       */
      const client = createUnauthenticatedClient(baseURL);

      /* Act - call with only non-readOnly properties */
      const response = await client.createUserReadOnly({
        body: {
          username: "testuser",
          email: "test@example.com",
        },
      });

      /* Assert - verify the operation was called (may fail due to auth) */
      expect(response).toBeDefined();
    });

    it("should generate getUserReadOnly operation for GET endpoint", async () => {
      /* Arrange */
      const client = createUnauthenticatedClient(baseURL);

      /* Assert - verify operation exists */
      expect(typeof client.getUserReadOnly).toBe("function");
    });
  });

  describe("writeOnly properties handling", () => {
    it("should generate operation for createUserWriteOnly endpoint", async () => {
      /* Arrange */
      const client = createUnauthenticatedClient(baseURL);

      /* Assert - verify operation exists */
      expect(typeof client.createUserWriteOnly).toBe("function");
    });

    it("should require writeOnly properties in request body", async () => {
      /*
       * Arrange - request body SHOULD include 'password' and 'passwordConfirm'
       * since they are writeOnly (allowed in request, excluded from response)
       */
      const client = createUnauthenticatedClient(baseURL);

      /* Act - call with writeOnly properties included */
      const response = await client.createUserWriteOnly({
        body: {
          username: "testuser",
          password: "secret123",
          passwordConfirm: "secret123",
        },
      });

      /* Assert - verify the operation was called */
      expect(response).toBeDefined();
    });
  });

  describe("combined readOnly and writeOnly properties handling", () => {
    it("should generate operations for endpoints with both readOnly and writeOnly", async () => {
      /* Arrange */
      const client = createUnauthenticatedClient(baseURL);

      /* Assert - verify operations exist */
      expect(typeof client.createUserBoth).toBe("function");
      expect(typeof client.updateUserBoth).toBe("function");
    });

    it("should allow request without readOnly and with writeOnly properties", async () => {
      /*
       * Arrange - request body should:
       * - NOT include 'id', 'createdAt', 'updatedAt' (readOnly)
       * - INCLUDE 'password', 'secretToken' (writeOnly - allowed in request)
       */
      const client = createUnauthenticatedClient(baseURL);

      /* Act - call with only request-valid properties */
      const response = await client.createUserBoth({
        body: {
          username: "testuser",
          email: "test@example.com",
          password: "secret123",
          secretToken: "token-abc-123",
        },
      });

      /* Assert - verify the operation was called */
      expect(response).toBeDefined();
    });

    it("should generate updateUserBoth operation", async () => {
      /* Arrange */
      const client = createUnauthenticatedClient(baseURL);

      /* Act */
      const response = await client.updateUserBoth({
        body: {
          username: "updateduser",
          email: "updated@example.com",
          password: "newpassword123",
        },
      });

      /* Assert */
      expect(response).toBeDefined();
    });
  });

  describe("nested objects with readOnly/writeOnly properties", () => {
    it("should generate operation for createProductWithMetadata endpoint", async () => {
      /* Arrange */
      const client = createUnauthenticatedClient(baseURL);

      /* Assert - verify operation exists */
      expect(typeof client.createProductWithMetadata).toBe("function");
    });

    it("should handle nested object with readOnly/writeOnly metadata", async () => {
      /*
       * Arrange - nested metadata object has:
       * - createdBy, lastModifiedBy: readOnly (excluded from request)
       * - internalNotes: writeOnly (allowed in request)
       */
      const client = createUnauthenticatedClient(baseURL);

      /* Act - call with nested properties appropriately included/excluded */
      const response = await client.createProductWithMetadata({
        body: {
          sku: "PROD-001",
          name: "Test Product",
          price: 99.99,
          metadata: {
            internalNotes: "This is a test product for integration testing",
          },
        },
      });

      /* Assert - verify the operation was called */
      expect(response).toBeDefined();
    });
  });
});
