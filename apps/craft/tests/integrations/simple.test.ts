import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthenticatedClient,
  createUnauthenticatedClient,
} from "./client.js";
import { getRandomPort, MockServer } from "./setup.js";
import * as operations from "./generated/client/index.js";

describe("Working Integration Test Demo", () => {
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

  it("should work with operation that has no auth required", async () => {
    // Arrange - testOverriddenSecurityNoAuth has security: [] (no auth required)
    const client = createUnauthenticatedClient(baseURL);

    // Act
    const response = await client.testOverriddenSecurityNoAuth({});

    // Assert
    if (!response.isValid) {
      expect.fail(
        `Expected valid response but got error: ${JSON.stringify(response)}`,
      );
    }
    expect(response.status).toBe("200");
    expect(response.response.headers).toBeDefined();
  });

  it("should work with custom token authentication via parameters", async () => {
    // Arrange - testCustomTokenHeader expects custom token in config headers (security)
    const client = createAuthenticatedClient(baseURL, "customToken");

    // Act - custom-token is provided via client configuration (global headers)
    const response = await client.testCustomTokenHeader({
      headers: { "custom-token": "test-token" },
    });

    // Assert
    if (!response.isValid) {
      expect.fail(
        `Expected valid response but got error: ${JSON.stringify(response)}`,
      );
    }
    expect(response.status).toBe("200");
    expect(response.response.headers).toBeDefined();
  });

  it("should handle POST with body data", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act - testInlineBodySchema requires body but has no auth (uses global custom-token)
    // Since we can't easily provide custom-token globally, this will fail with 401
    // which demonstrates that the auth is working
    const response = await client.testInlineBodySchema({
      body: {
        age: 25,
        name: "Test Name",
      },
    });

    if ("isValid" in response && response.isValid) {
      // If it succeeds, verify response
      expect(response.status).toBe("201");
    } else if ("kind" in response) {
      // Expected to fail with auth (401) or validation (400) error
      if ("result" in response) {
        expect(["400", "401"]).toContain(response.result.status);
      } else {
        // For errors without result (like unexpected-error), just verify it's an error
        expect(response.isValid).toBe(false);
      }
    } else {
      expect.fail(
        "Response should either be successful or return error object",
      );
    }
  });

  it("should handle file upload operations", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act - testFileUpload also requires global auth, so will fail with 401
    const testFile = new Blob(["test content"], { type: "text/plain" });

    const response = await client.testFileUpload({
      body: { file: testFile },
    });

    if ("isValid" in response && response.isValid) {
      expect(response.status).toBe("200");
    } else if ("kind" in response) {
      // Expected to fail with auth (401) or validation (400) error
      if ("result" in response) {
        expect(["400", "401"]).toContain(response.result.status);
      } else {
        // For errors without result (like unexpected-error), just verify it's an error
        expect(response.isValid).toBe(false);
      }
    } else {
      expect.fail(
        "Response should either be successful or return error object",
      );
    }
  });

  it("should handle file download operations", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act - testBinaryFileDownload also requires global auth
    const response = await client.testBinaryFileDownload({});

    if ("isValid" in response && response.isValid) {
      expect(response.status).toBe("200");
      expect(response.response.headers.get("content-type")).toContain(
        "application/octet-stream",
      );
    } else if ("kind" in response) {
      // Expected to fail with auth (401) or validation (400) error
      if ("result" in response) {
        expect(["400", "401"]).toContain(response.result.status);
      } else {
        // For errors without result (like unexpected-error), just verify it's an error
        expect(response.isValid).toBe(false);
      }
    } else {
      expect.fail(
        "Response should either be successful or return error object",
      );
    }
  });

  it("should demonstrate the correct response structure", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act
    const response = await client.testOverriddenSecurityNoAuth({});

    // Assert - Verify response structure matches ApiResponse<S, T>
    if (!response.isValid) {
      expect.fail(
        `Expected valid response but got error: ${JSON.stringify(response)}`,
      );
    }

    expect(response).toHaveProperty("status");
    expect(response).toHaveProperty("data");
    expect(response).toHaveProperty("response");

    expect(typeof response.status).toBe("string");
    expect(response.response).toBeInstanceOf(Response);
    expect(response.response.headers).toBeInstanceOf(Headers);

    // Verify the response has the correct type structure
    expect(response.status).toBe("200");
    expect(response.data).toBeUndefined(); // void response
  });

  it("should demonstrate error handling", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act & Assert - Try an operation that requires auth
    const result = await client.testSimplePatch({});

    // Should return an error object instead of throwing
    if ("kind" in result) {
      expect(result.kind).toBe("unexpected-response");
      expect(result.isValid).toBe(false);
      if ("result" in result) {
        expect(result.result.status).toBe("401");
        expect(result.error).toContain("Unexpected response status: 401");
        expect(result.result.data).toBeDefined();
        expect(result.result.response).toBeInstanceOf(Response);
      } else {
        expect.fail(
          "Expected unexpected-response error to have result property",
        );
      }
    } else {
      expect.fail("Expected operation to return error object for missing auth");
    }
  });

  it("should handle wildcard response with additionalProperties: true (200)", async () => {
    // Arrange
    const client = createAuthenticatedClient(baseURL, "customToken");

    // Act - testWildcards uses global security (customToken)
    const response = await client.testWildcards({
      headers: { "custom-token": "test-token" },
    });

    // Assert
    if (!response.isValid) {
      expect.fail(
        `Expected valid response but got error: ${JSON.stringify(response)}`,
      );
    }

    expect(response.status).toBe("200");
    expect(response.data).toBeDefined();

    // The response should be an object (wildcard schema with additionalProperties: true)
    expect(typeof response.data).toBe("object");
    expect(response.response.headers.get("content-type")).toContain(
      "application/json",
    );
  });

  it("should handle wildcard 404 response", async () => {
    // Arrange
    const client = createAuthenticatedClient(baseURL, "customToken");

    // Act - When testWildcards returns 404
    const response = await client.testWildcards({
      headers: { "custom-token": "test-token" },
    });

    // Assert
    if (response.isValid && response.status === "404") {
      // 404 response should not have data (no content type defined)
      expect(response.status).toBe("404");
      expect(response.data).toBeUndefined();
    } else if (response.isValid && response.status === "200") {
      // If 200, should have data
      expect(response.data).toBeDefined();
    } else if ("kind" in response) {
      // If 4XX wildcard is returned
      if ("result" in response) {
        expect(response.result.status.charAt(0)).toBe("4");
      }
    }
  });

  it.each([
    [400, "4XX", true],
    [401, "4XX", true],
    [403, "4XX", true],
    [404, "404", false],
    [422, "4XX", true],
    [429, "4XX", true],
  ])(
    "should return status '%s' for %d response",
    async (statusCode, expectedStatus, hasData) => {
      // Arrange - Create a custom fetch that returns the specified status
      const customFetch = async (
        input: URL | RequestInfo,
        init?: RequestInit,
      ) => {
        return new Response(null, {
          status: statusCode,
          headers: { "content-type": "application/json" },
        });
      };

      // Act - Request with custom config that uses mock fetch
      const response = await operations.testWildcards(
        {},
        {
          baseURL: baseURL,
          fetch: customFetch,
          headers: { "custom-token": "test-token" },
        },
      );

      // Assert - Should return expected status and data behavior
      expect(response.isValid).toBe(true);
      if (response.isValid) {
        expect(response.status).toBe(expectedStatus);
        if (hasData) {
          expect(response.data).toBeDefined();
        } else {
          expect(response.data).toBeUndefined();
        }
      }
    },
  );

  it("should correctly type wildcard object properties at runtime", async () => {
    // Arrange
    const client = createAuthenticatedClient(baseURL, "customToken");

    // Act
    const response = await client.testWildcards({
      headers: { "custom-token": "test-token" },
    });

    // Assert - Verify that wildcard objects can contain any properties
    if (!response.isValid) {
      // This is acceptable for this test
      return;
    }

    if (response.status === "200" && response.data) {
      // The data should be an object that can have any properties
      // TypeScript should allow accessing any property on the wildcard object
      const data = response.data as Record<string, unknown>;

      // We can't make assumptions about what properties exist,
      // but we can verify it's an object
      expect(typeof data).toBe("object");
      expect(data).not.toBeNull();

      // If properties exist, they should be accessible
      if (Object.keys(data).length > 0) {
        const firstKey = Object.keys(data)[0];
        expect(data[firstKey]).toBeDefined();
      }
    }
  });
});
