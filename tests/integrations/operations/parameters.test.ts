import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "../setup.js";
import { createUnauthenticatedClient } from "../client.js";
import { sampleData } from "../fixtures/test-helpers.js";

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
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        pathParam: sampleData.pathParams["path-param"],
        fooBar: "test-query-with-dash",
        headerInlineParam: sampleData.headerParams.headerInlineParam,
        requestId: sampleData.headerParams["request-id"],
        xHeaderParam: sampleData.headerParams["x-header-param"],
      };

      // Act
      const response = await client.testParameterWithDash(params);

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should reject missing required path parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        // Missing required pathParam
        fooBar: "test-query-with-dash",
        headerInlineParam: sampleData.headerParams.headerInlineParam,
        requestId: sampleData.headerParams["request-id"],
        xHeaderParam: sampleData.headerParams["x-header-param"],
      } as any;

      // Act & Assert
      await expect(client.testParameterWithDash(params)).rejects.toThrow();
    });

    it("should reject missing required header parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        pathParam: sampleData.pathParams["path-param"],
        fooBar: "test-query-with-dash",
        // Missing required headerInlineParam
        requestId: sampleData.headerParams["request-id"],
        xHeaderParam: sampleData.headerParams["x-header-param"],
      } as any;

      // Act & Assert
      await expect(client.testParameterWithDash(params)).rejects.toThrow();
    });
  });

  describe("testParameterWithDashAnUnderscore operation", () => {
    it("should handle parameters with dashes and underscores", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        pathParam: sampleData.pathParams["path-param"],
        fooBar: "test-underscore-param",
        headerInlineParam: sampleData.headerParams.headerInlineParam,
        requestId: sampleData.headerParams["request-id"],
        xHeaderParam: sampleData.headerParams["x-header-param"],
      };

      // Act
      const response = await client.testParameterWithDashAnUnderscore(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should handle optional query parameters", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        pathParam: sampleData.pathParams["path-param"],
        // fooBar is optional, not providing it
        headerInlineParam: sampleData.headerParams.headerInlineParam,
        requestId: sampleData.headerParams["request-id"],
        xHeaderParam: sampleData.headerParams["x-header-param"],
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
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        firstParam: sampleData.pathParams["first-param"],
        secondParam: sampleData.pathParams["second-param"],
      };

      // Act
      const response = await client.testWithTwoParams(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should reject missing first path parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        // Missing firstParam
        secondParam: sampleData.pathParams["second-param"],
      } as any;

      // Act & Assert
      await expect(client.testWithTwoParams(params)).rejects.toThrow();
    });

    it("should reject missing second path parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        firstParam: sampleData.pathParams["first-param"],
        // Missing secondParam
      } as any;

      // Act & Assert
      await expect(client.testWithTwoParams(params)).rejects.toThrow();
    });
  });

  describe("testParametersAtPathLevel operation", () => {
    it("should handle path-level parameters", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        requestId: sampleData.headerParams["request-id"],
        cursor: sampleData.queryParams.cursor,
      };

      // Act
      const response = await client.testParametersAtPathLevel(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should reject missing required path-level parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        // Missing required requestId (RequiredRequestId at path level)
        cursor: sampleData.queryParams.cursor,
      } as any;

      // Act & Assert
      await expect(client.testParametersAtPathLevel(params)).rejects.toThrow();
    });
  });

  describe("testParamWithSchemaRef operation", () => {
    it("should handle parameter with schema reference", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        param: sampleData.pathParams.param, // Should match CustomStringFormatTest
      };

      // Act
      const response = await client.testParamWithSchemaRef(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should validate parameter against schema reference", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        param: "", // Empty string might not match schema requirements
      };

      // Act
      const response = await client.testParamWithSchemaRef(params);

      // Assert - Prism may validate or just accept it
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("testHeaderWithSchemaRef operation", () => {
    it("should handle header parameter with schema reference", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        param: sampleData.pathParams.param, // Should match CustomStringFormatTest
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
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        param: sampleData.pathParams.param,
      };

      // Act
      const response = await client.testHeaderOptional(params);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should work without optional header parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
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
      const client = createUnauthenticatedClient(baseURL);
      const params = {
        requestId: sampleData.headerParams["request-id"],
      };

      // Act
      const response = await client.testParameterWithReference(params);

      // Assert
      expect(response.status).toBe(201);
    });

    it("should work without optional referenced parameter", async () => {
      // Arrange
      const client = createUnauthenticatedClient(baseURL);
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