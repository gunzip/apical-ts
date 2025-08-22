import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "../setup.js";
import { createAuthenticatedClient, createUnauthenticatedClient } from "../client.js";

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
      const response = await client.testOverriddenSecurity({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should reject request without proper bearer token", async () => {
      // Arrange - Using wrong auth scheme (customToken instead of bearerToken)
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act & Assert
      await expect(client.testOverriddenSecurity({})).rejects.toThrow();
    });

    it("should reject unauthenticated request", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      await expect(client.testOverriddenSecurity({})).rejects.toThrow();
    });
  });

  describe("testOverriddenSecurityNoAuth operation", () => {
    it("should work without authentication (empty security)", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act
      const response = await client.testOverriddenSecurityNoAuth({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should work with authentication present but not required", async () => {
      // Arrange - Even though auth is provided, it should still work
      const client = createAuthenticatedClient(baseURL, "bearerToken");

      // Act
      const response = await client.testOverriddenSecurityNoAuth({});

      // Assert
      expect(response.status).toBe(200);
    });

    it("should work with any auth scheme since none is required", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act
      const response = await client.testOverriddenSecurityNoAuth({});

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe("Global vs Operation-specific security", () => {
    it("should respect global security when no override", async () => {
      // Arrange - Global security requires customToken
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act - testCustomTokenHeader uses global security (customToken)
      const response = await client.testCustomTokenHeader({});

      // Assert
      expect(response.status).toBe(200);
    });

    it("should reject global security with wrong scheme", async () => {
      // Arrange - Using bearerToken instead of customToken for global security
      const client = createAuthenticatedClient(baseURL, "bearerToken");

      // Act & Assert - testCustomTokenHeader should fail
      await expect(client.testCustomTokenHeader({})).rejects.toThrow();
    });

    it("should allow operation-specific security to override global", async () => {
      // Arrange
      const bearerTokenClient = createAuthenticatedClient(baseURL, "bearerToken");
      const customTokenClient = createAuthenticatedClient(baseURL, "customToken");

      // Act - testOverriddenSecurity uses bearerToken (overrides global customToken)
      const bearerResponse = await bearerTokenClient.testOverriddenSecurity({});
      
      // testCustomTokenHeader uses global customToken
      const customResponse = await customTokenClient.testCustomTokenHeader({});

      // Assert
      expect(bearerResponse.status).toBe(200);
      expect(customResponse.status).toBe(200);
    });
  });

  describe("Security scheme validation", () => {
    it("should validate bearer token format", async () => {
      // Arrange - Using simpleToken where bearerToken is expected
      const client = createAuthenticatedClient(baseURL, "simpleToken");

      // Act & Assert - Should fail for operation requiring bearerToken
      await expect(client.testOverriddenSecurity({})).rejects.toThrow();
    });

    it("should validate custom header names", async () => {
      // Arrange - testSimpleToken requires X-Functions-Key header
      const simpleTokenClient = createAuthenticatedClient(baseURL, "simpleToken");
      const bearerTokenClient = createAuthenticatedClient(baseURL, "bearerToken");

      // Act
      const simpleResponse = await simpleTokenClient.testSimpleToken({
        qr: "required-param",
        qo: "optional-param",
        cursor: "test-cursor"
      });

      // Assert
      expect(simpleResponse.status).toBe(200);

      // Act & Assert - bearerToken should fail for simpleToken operation
      await expect(bearerTokenClient.testSimpleToken({
        qr: "required-param",
        qo: "optional-param", 
        cursor: "test-cursor"
      })).rejects.toThrow();
    });
  });

  describe("Security error handling", () => {
    it("should provide meaningful error for missing authentication", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);

      // Act & Assert
      try {
        await client.testOverriddenSecurity({});
        expect.fail("Expected request to throw an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Error should indicate authentication failure
        expect(error.message || error.toString()).toMatch(/40[13]/); // 401 or 403
      }
    });

    it("should provide meaningful error for wrong authentication", async () => {
      // Arrange - Using wrong auth type
      const client = createAuthenticatedClient(baseURL, "customToken");

      // Act & Assert
      try {
        await client.testOverriddenSecurity({});
        expect.fail("Expected request to throw an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Error should indicate authentication failure
        expect(error.message || error.toString()).toMatch(/40[13]/); // 401 or 403
      }
    });

    it("should handle network errors gracefully", async () => {
      // Arrange - Create client with invalid URL to test error handling
      const invalidClient = createAuthenticatedClient("http://localhost:99999", "bearerToken");

      // Act & Assert
      try {
        await invalidClient.testOverriddenSecurity({});
        expect.fail("Expected request to throw an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Should be a network error, not a security error
        expect(error.message || error.toString()).toMatch(/fetch|network|connection/i);
      }
    });
  });
});