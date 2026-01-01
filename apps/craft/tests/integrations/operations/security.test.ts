import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthenticatedClient,
  createUnauthenticatedClient,
} from "../client.js";
import { getRandomPort, MockServer } from "../setup.js";

describe("Security Operations", () => {
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

  describe("testOverriddenSecurity operation", () => {
    it("should use bearerToken security scheme when overridden", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "bearerToken");

      // Act
      const response = await client.testOverriddenSecurity({
        headers: { Authorization: "Bearer test-token" },
      });

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail("Expected successful response from testOverriddenSecurity");
      }
    });

    it("should reject request without proper bearer token", async () => {
      // Arrange - Using wrong auth scheme (customToken instead of bearerToken)
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act & Assert
      try {
        await client.testOverriddenSecurity({
          headers: { Authorization: "Bearer test-token" },
        });
        expect.fail(
          "Expected operation to throw error due to wrong auth scheme",
        );
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });

    it("should reject unauthenticated request", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      try {
        await client.testOverriddenSecurity({
          headers: { Authorization: "Bearer test-token" },
        });
        expect.fail(
          "Expected operation to throw error due to missing authentication",
        );
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });
  });

  describe("testOverriddenSecurityNoAuth operation", () => {
    it("should work without authentication (empty security)", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act
      const response = await client.testOverriddenSecurityNoAuth({});

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail(
          "Expected successful response from testOverriddenSecurityNoAuth",
        );
      }
    });

    it("should work with authentication present but not required", async () => {
      // Arrange - Even though auth is provided, it should still work
      const client = createAuthenticatedClient(baseURL, "bearerToken");

      // Act
      const response = await client.testOverriddenSecurityNoAuth({});

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail(
          "Expected successful response from testOverriddenSecurityNoAuth",
        );
      }
    });

    it("should work with any auth scheme since none is required", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testOverriddenSecurityNoAuth({});

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail("Expected successful response from testCustomTokenHeader");
      }
    });
  });

  describe("Global vs Operation-specific security", () => {
    it("should respect global security when no override", async () => {
      // Arrange - Global security requires customToken
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act - testCustomTokenHeader uses global security (customToken)
      const response = await client.testCustomTokenHeader({
        headers: { "custom-token": "test-token" },
      });

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail("Expected successful response from testCustomTokenHeader");
      }
    });

    it("should reject global security with wrong scheme", async () => {
      // Arrange - Using bearerToken instead of customToken for global security
      const client = createAuthenticatedClient(baseURL, "bearerToken");

      // Act & Assert - testCustomTokenHeader should fail
      try {
        await client.testCustomTokenHeader({
          headers: { "custom-token": "test-token" },
        });
        expect.fail(
          "Expected operation to throw error due to wrong auth scheme",
        );
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });

    it("should allow operation-specific security to override global", async () => {
      // Arrange
      const bearerTokenClient = createAuthenticatedClient(
        baseURL,
        "bearerToken",
      );
      const customTokenClient = createAuthenticatedClient(
        baseURL,
        "customToken",
      );

      // Act - testOverriddenSecurity uses bearerToken (overrides global customToken)
      const bearerResponse = await bearerTokenClient.testOverriddenSecurity({
        headers: { Authorization: "Bearer test-token" },
      });

      // testCustomTokenHeader uses global customToken
      const customResponse = await customTokenClient.testCustomTokenHeader({
        headers: { "custom-token": "test-token" },
      });

      // Assert
      if (bearerResponse.isValid) {
        expect(bearerResponse.status).toBe("200");
      } else {
        expect.fail("Expected successful response from bearerResponse");
      }
      if (customResponse.isValid) {
        expect(customResponse.status).toBe("200");
      } else {
        expect.fail("Expected successful response from customResponse");
      }
    });
  });

  describe("Security scheme validation", () => {
    it("should validate bearer token format", async () => {
      // Arrange - Using simpleToken where bearerToken is expected
      const client = createAuthenticatedClient(baseURL, "simpleToken");

      // Act & Assert - Should fail for operation requiring bearerToken
      try {
        await client.testOverriddenSecurity({
          headers: { Authorization: "Bearer test-token" },
        });
        expect.fail(
          "Expected operation to throw error due to wrong token format",
        );
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });

    it("should validate custom header names", async () => {
      // Arrange - testSimpleToken requires X-Functions-Key header
      const simpleTokenClient = createAuthenticatedClient(
        baseURL,
        "simpleToken",
      );
      const bearerTokenClient = createAuthenticatedClient(
        baseURL,
        "bearerToken",
      );

      // Act
      const simpleResponse = await simpleTokenClient.testSimpleToken({
        query: {
          cursor: "test-cursor",
          qo: "optional-param",
          qr: "required-param",
        },
        headers: {
          "X-Functions-Key": "test-simple-token",
        },
      });

      // Assert
      if (simpleResponse.isValid) {
        expect(simpleResponse.status).toBe("200");
      } else {
        expect.fail("Expected successful response from simpleResponse");
      }

      // Act & Assert - bearerToken should fail for simpleToken operation
      try {
        await bearerTokenClient.testSimpleToken({
          query: {
            cursor: "test-cursor",
            qo: "optional-param",
            qr: "required-param",
          },
          headers: {
            "X-Functions-Key": "test-simple-token",
          },
        });
        expect.fail(
          "Expected operation to throw error due to wrong token type",
        );
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });
  });

  describe("Security error handling", () => {
    it("should provide meaningful error for missing authentication", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      try {
        await client.testOverriddenSecurity({
          headers: { Authorization: "Bearer test-token" },
        });
        expect.fail("Expected request to throw an error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate comprehensive error shape
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });

    it("should provide meaningful error for wrong authentication", async () => {
      // Arrange - Using wrong auth type
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act & Assert
      try {
        await client.testOverriddenSecurity({
          headers: { Authorization: "Bearer test-token" },
        });
        expect.fail("Expected request to throw an error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate comprehensive error shape
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(parseInt(err.status)).toBeLessThan(500);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
        }
      }
    });

    it("should handle network errors gracefully", async () => {
      // Arrange - Create client with invalid URL to test error handling
      const invalidClient = createAuthenticatedClient(
        "http://localhost:99999",
        "bearerToken",
      );

      // Act
      const result = await invalidClient.testOverriddenSecurity({
        headers: { Authorization: "Bearer test-token" },
      });

      // Assert - Should return error result instead of throwing
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        const r = result as any;
        expect(r.kind).toBe("unexpected-error");
        expect(r.error).toBeDefined();
      } else {
        expect.fail("Expected unexpected-error result from invalidClient call");
      }
    });
  });
});
