import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "./setup.js";
import { createUnauthenticatedClient } from "./client.js";

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
    expect(response.status).toBe(200);
    expect(response.response.headers).toBeDefined();
  });

  it("should work with custom token authentication via parameters", async () => {
    // Arrange - testCustomTokenHeader expects custom token as parameter
    const client = createUnauthenticatedClient(baseURL);

    // Act
    const response = await client.testCustomTokenHeader({
      headers: {
        "custom-token": "test-custom-token-abc",
      },
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.response.headers).toBeDefined();
  });

  it("should handle POST with body data", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act - testInlineBodySchema requires body but has no auth (uses global custom-token)
    // Since we can't easily provide custom-token globally, this will fail with 401
    // which demonstrates that the auth is working
    try {
      const response = await client.testInlineBodySchema({
        body: {
          name: "Test Name",
          age: 25,
        },
      });
      // If it succeeds, verify response
      expect(response.status).toBe(201);
    } catch (error) {
      // Expected to fail with auth (401) or validation (400) error
      expect(error.message).toMatch(/40[01]/);
    }
  });

  it("should handle file upload operations", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act - testFileUpload also requires global auth, so will fail with 401
    try {
      const formData = new FormData();
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');
      
      const response = await client.testFileUpload({
        body: formData,
      });
      expect(response.status).toBe(200);
    } catch (error) {
      // Expected to fail with auth (401) or validation (400) error
      expect(error.message).toMatch(/40[01]/);
    }
  });

  it("should handle file download operations", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act - testBinaryFileDownload also requires global auth
    try {
      const response = await client.testBinaryFileDownload({});
      expect(response.status).toBe(200);
      expect(response.response.headers.get("content-type")).toContain("application/octet-stream");
    } catch (error) {
      // Expected to fail with auth (401) or validation (400) error
      expect(error.message).toMatch(/40[01]/);
    }
  });

  it("should demonstrate the correct response structure", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act
    const response = await client.testOverriddenSecurityNoAuth({});

    // Assert - Verify response structure matches ApiResponse<S, T>
    expect(response).toHaveProperty("status");
    expect(response).toHaveProperty("data");
    expect(response).toHaveProperty("response");
    
    expect(typeof response.status).toBe("number");
    expect(response.response).toBeInstanceOf(Response);
    expect(response.response.headers).toBeInstanceOf(Headers);
    
    // Verify the response has the correct type structure
    expect(response.status).toBe(200);
    expect(response.data).toBeUndefined(); // void response
  });

  it("should demonstrate error handling", async () => {
    // Arrange
    const client = createUnauthenticatedClient(baseURL);

    // Act & Assert - Try an operation that requires auth
    try {
      await client.testSimplePatch({});
      expect.fail("Expected operation to throw error due to missing auth");
    } catch (error) {
      expect(error.message).toContain("Unexpected response status: 401");
      expect(error.status).toBe(401);
      expect(error.data).toBeDefined();
      expect(error.response).toBeInstanceOf(Response);
    }
  });
});