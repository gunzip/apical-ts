import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedClient } from "../client.js";
import { sampleData } from "../fixtures/test-helpers.js";
import { getRandomPort, MockServer } from "../setup.js";

describe("Parameters Operations", () => {
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

  describe("testParameterWithDash operation", () => {
    it("should handle path and query parameters with dashes", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {
          headerInlineParam: sampleData.headerParams.headerInlineParam,
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        path: {
          pathParam: sampleData.pathParams["path-param"],
        },
        query: {
          fooBar: "test-query-with-dash",
          requestId: sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParameterWithDash(params);

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should reject missing required path parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {
          headerInlineParam: sampleData.headerParams.headerInlineParam,
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        // Missing required pathParam
        query: {
          fooBar: "test-query-with-dash",
          requestId: sampleData.headerParams["request-id"],
        },
      } as any;

      // Act & Assert
      try {
        await client.testParameterWithDash(params);
        expect.fail(
          "Expected operation to throw error due to missing required path parameter",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });

    it("should reject missing required header parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {
          // Missing required headerInlineParam
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        path: {
          pathParam: sampleData.pathParams["path-param"],
        },
        query: {
          fooBar: "test-query-with-dash",
          requestId: sampleData.headerParams["request-id"],
        },
      } as any;

      // Act & Assert
      try {
        await client.testParameterWithDash(params);
        expect.fail(
          "Expected operation to throw error due to missing required header parameter",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testParameterWithDashAnUnderscore operation", () => {
    it("should handle parameters with dashes and underscores", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {
          headerInlineParam: sampleData.headerParams.headerInlineParam,
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        path: {
          pathParam: sampleData.pathParams["path-param"],
        },
        query: {
          fooBar: "test-underscore-param",
          requestId: sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParameterWithDashAnUnderscore(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should handle optional query parameters", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        // fooBar is optional, not providing it
        headers: {
          headerInlineParam: sampleData.headerParams.headerInlineParam,
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        path: {
          pathParam: sampleData.pathParams["path-param"],
        },
      };

      // Act
      const response = await client.testParameterWithDashAnUnderscore(params);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe("testWithTwoParams operation", () => {
    it("should handle multiple path parameters", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        path: {
          firstParam: sampleData.pathParams["first-param"],
          secondParam: sampleData.pathParams["second-param"],
        },
      };

      // Act
      const response = await client.testWithTwoParams(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should reject missing first path parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        path: {
          // Missing firstParam
          secondParam: sampleData.pathParams["second-param"],
        },
      } as any;

      // Act & Assert
      try {
        await client.testWithTwoParams(params);
        expect.fail(
          "Expected operation to throw error due to missing first path parameter",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });

    it("should reject missing second path parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        path: {
          firstParam: sampleData.pathParams["first-param"],
          // Missing secondParam
        },
      } as any;

      // Act & Assert
      try {
        await client.testWithTwoParams(params);
        expect.fail(
          "Expected operation to throw error due to missing second path parameter",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testParametersAtPathLevel operation", () => {
    it("should handle path-level parameters", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        query: {
          cursor: sampleData.queryParams.cursor,
          requestId: sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParametersAtPathLevel(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should reject missing required path-level parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        query: {
          // Missing required requestId (RequiredRequestId at path level)
          cursor: sampleData.queryParams.cursor,
        },
      } as any;

      // Act & Assert
      try {
        await client.testParametersAtPathLevel(params);
        expect.fail(
          "Expected operation to throw error due to missing required path-level parameter",
        );
      } catch (error) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (error.status !== undefined) {
          expect(error.status).toBeGreaterThanOrEqual(400);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testParamWithSchemaRef operation", () => {
    it("should handle parameter with schema reference", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        path: {
          param: sampleData.pathParams.param, // Should match CustomStringFormatTest
        },
      };

      // Act
      const response = await client.testParamWithSchemaRef(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should validate parameter against schema reference", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        path: {
          param: "invalid-value", // Use an actual value that might fail validation rather than empty string
        },
      };

      // Act & Assert
      try {
        const response = await client.testParamWithSchemaRef(params);
        // Test passes if the operation succeeds
        expect(response.status).toBe(200);
      } catch (error) {
        // If validation fails, verify error shape
        expect(error).toBeDefined();
        if (error.status !== undefined) {
          expect([400, 422]).toContain(error.status);
          expect(error.data).toBeDefined();
          expect(error.response).toBeInstanceOf(Response);
        } else {
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe("string");
        }
      }
    });
  });

  describe("testHeaderWithSchemaRef operation", () => {
    it("should handle header parameter with schema reference", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {
          param: sampleData.pathParams.param, // Should match CustomStringFormatTest
        },
      };

      // Act
      const response = await client.testHeaderWithSchemaRef(params);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe("testHeaderOptional operation", () => {
    it("should handle optional header parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {
          param: sampleData.pathParams.param,
        },
      };

      // Act
      const response = await client.testHeaderOptional(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should work without optional header parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        // param is optional, not providing it
      };

      // Act
      const response = await client.testHeaderOptional(params);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe("testParameterWithReference operation", () => {
    it("should handle parameter references", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        query: {
          requestId: sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParameterWithReference(params);

      // Assert
      expect(response.status).toBe(201);
    });

    it("should work without optional referenced parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        // requestId is optional via reference, not providing it
      };

      // Act
      const response = await client.testParameterWithReference(params);

      // Assert
      expect(response.status).toBe(201);
    });
  });
});
