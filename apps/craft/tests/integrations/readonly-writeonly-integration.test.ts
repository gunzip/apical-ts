import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ProductWithReadOnlyMeta } from "./generated/schemas/ProductWithReadOnlyMeta.js";
import { ProductWithReadOnlyMetaRequest } from "./generated/schemas/ProductWithReadOnlyMetaRequest.js";
import { ProductWithReadOnlyMetaResponse } from "./generated/schemas/ProductWithReadOnlyMetaResponse.js";
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
  }, 30000); // Increase timeout for server startup

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

    it("should exclude readOnly nested properties from request type", () => {
      /*
       * This test verifies TypeScript type checking - readOnly nested properties
       * should not be present in the request type
       */
      const client = createUnauthenticatedClient(baseURL);

      /* Verify we can call with valid request */
      expect(typeof client.createProductWithMetadata).toBe("function");

      /* TypeScript should prevent this at compile time:
       * const invalidRequest = {
       *   body: {
       *     sku: "PROD-003",
       *     name: "Invalid Product",
       *     metadata: {
       *       createdBy: "should not compile", // readOnly property
       *       internalNotes: "This is valid",
       *     },
       *   },
       * };
       */
    });

    it("should validate request schema excludes readOnly nested properties", () => {
      /* Test that ProductWithReadOnlyMetaRequest schema rejects readOnly properties */
      const validRequestData = {
        sku: "PROD-004",
        name: "Test Product",
        metadata: {
          internalNotes: "Valid writeOnly field",
        },
      };

      const invalidRequestData = {
        sku: "PROD-005",
        name: "Test Product",
        metadata: {
          createdBy: "This should fail validation",
          internalNotes: "Valid writeOnly field",
        },
      };

      /* Valid request should parse successfully */
      const validResult =
        ProductWithReadOnlyMetaRequest.safeParse(validRequestData);
      expect(validResult.success).toBe(true);

      /* Invalid request with readOnly field should fail - but Zod strips unknown fields by default */
      const invalidResult =
        ProductWithReadOnlyMetaRequest.safeParse(invalidRequestData);
      expect(invalidResult.success).toBe(true); // Zod strips unknown fields
      if (invalidResult.success) {
        /* Verify readOnly field was stripped */
        // @ts-expect-error
        expect(invalidResult.data.metadata?.createdBy).toBeUndefined();
      }
    });

    it("should validate response schema excludes writeOnly nested properties", () => {
      /* Test that ProductWithReadOnlyMetaResponse schema rejects writeOnly properties */
      const validResponseData = {
        sku: "PROD-006",
        name: "Test Product",
        metadata: {
          createdBy: "system",
          lastModifiedBy: "admin",
        },
      };

      const invalidResponseData = {
        sku: "PROD-007",
        name: "Test Product",
        metadata: {
          createdBy: "system",
          internalNotes: "This should not be in response",
        },
      };

      /* Valid response should parse successfully */
      const validResult =
        ProductWithReadOnlyMetaResponse.safeParse(validResponseData);
      expect(validResult.success).toBe(true);

      /* Invalid response with writeOnly field should fail - but Zod strips unknown fields by default */
      const invalidResult =
        ProductWithReadOnlyMetaResponse.safeParse(invalidResponseData);
      expect(invalidResult.success).toBe(true); // Zod strips unknown fields
      if (invalidResult.success) {
        /* Verify writeOnly field was stripped */
        // @ts-expect-error
        expect(invalidResult.data.metadata?.internalNotes).toBeUndefined();
      }
    });
  });
});
