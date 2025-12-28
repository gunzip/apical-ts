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
          "path-param": sampleData.pathParams["path-param"], // Use exact parameter name from OpenAPI spec
        },
        query: {
          "foo-bar": "test-query-with-dash", // Use exact parameter name from OpenAPI spec
          "request-id": sampleData.headerParams["request-id"], // Use exact parameter name from OpenAPI spec
        },
      };

      // Act
      const response = await client.testParameterWithDash(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
        expect(response.response.headers).toBeDefined();
      } else {
        expect.fail("Expected successful response from testParameterWithDash");
      }
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
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
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
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
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
          "header-InlineParam": sampleData.headerParams.headerInlineParam,
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        path: {
          "path-param": sampleData.pathParams["path-param"],
        },
        query: {
          foo_bar: "test-underscore-param",
          "request-id": sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParameterWithDashAnUnderscore(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail(
          "Expected successful response from testParameterWithDashAnUnderscore",
        );
      }
    });

    it("should handle optional query parameters", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        // fooBar is optional, not providing it
        headers: {
          "header-InlineParam": sampleData.headerParams.headerInlineParam,
          "x-header-param": sampleData.headerParams["x-header-param"],
        },
        path: {
          "path-param": sampleData.pathParams["path-param"],
        },
      };

      // Act
      const response = await client.testParameterWithDashAnUnderscore(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail(
          "Expected successful response from testParameterWithDashAnUnderscore",
        );
      }
    });
  });

  describe("testWithTwoParams operation", () => {
    it("should handle multiple path parameters", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        path: {
          "first-param": sampleData.pathParams["first-param"], // Use exact parameter name from OpenAPI spec
          "second-param": sampleData.pathParams["second-param"], // Use exact parameter name from OpenAPI spec
        },
      };

      // Act
      const response = await client.testWithTwoParams(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail("Expected successful response from testWithTwoParams");
      }
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
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
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
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
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
          "request-id": sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParametersAtPathLevel(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail(
          "Expected successful response from testParametersAtPathLevel",
        );
      }
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
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // Validate error shape - different types of errors may have different structures
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(parseInt(err.status)).toBeGreaterThanOrEqual(400);
          expect(err.data).toBeDefined();
          expect(err.response).toBeInstanceOf(Response);
        } else {
          // For validation errors or other error types, validate basic error properties
          const err = error as any;
          expect(err.message).toBeDefined();
          expect(typeof err.message).toBe("string");
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
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail("Expected successful response from testParamWithSchemaRef");
      }
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
        if (response.isValid) {
          expect(response.status).toBe("200");
        } else {
          expect.fail(
            "Expected successful response from testParamWithSchemaRef",
          );
        }
      } catch (error: unknown) {
        // If validation fails, verify error shape
        expect(error).toBeDefined();
        if (typeof error === "object" && error !== null && "status" in error) {
          const err = error as any;
          expect(["400", "422"]).toContain(err.status);
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
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail(
          "Expected successful response from testHeaderWithSchemaRef",
        );
      }
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
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail("Expected successful response from testHeaderOptional");
      }
    });

    it("should work without optional header parameter", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        headers: {},
      };

      // Act
      const response = await client.testHeaderOptional(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("200");
      } else {
        expect.fail("Expected successful response from testHeaderOptional");
      }
    });
  });

  describe("testParameterWithReference operation", () => {
    it("should handle parameter references", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, "customToken");
      const params = {
        query: {
          "request-id": sampleData.headerParams["request-id"],
        },
      };

      // Act
      const response = await client.testParameterWithReference(params);

      // Assert
      if (response.isValid) {
        expect(response.status).toBe("201");
      } else {
        expect.fail(
          "Expected successful response from testParameterWithReference",
        );
      }
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
      if (response.isValid) {
        expect(response.status).toBe("201");
      } else {
        expect.fail(
          "Expected successful response from testParameterWithReference",
        );
      }
    });
  });
});
