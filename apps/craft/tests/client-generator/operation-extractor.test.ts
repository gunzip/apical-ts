import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
} from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { applyGeneratedOperationIds } from "../../src/operation-id-generator/index.js";
import {
  extractAllOperations,
  extractServerUrls,
  extractRequestContentTypes,
  extractResponseContentTypes,
} from "../../src/client-generator/operation-extractor.js";

describe("client-generator operation-extractor", () => {
  describe("extractServerUrls", () => {
    it("should extract all server URLs", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        servers: [
          { url: "https://api.example.com/v1" },
          { url: "https://backup.example.com/v1" },
          { url: "https://dev.example.com/v1" },
        ],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([
        "https://api.example.com/v1",
        "https://backup.example.com/v1",
        "https://dev.example.com/v1",
      ]);
    });

    it("should return empty array when no servers", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when servers array is empty", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        servers: [],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([]);
    });

    it("should filter out servers with undefined URLs", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        servers: [
          { url: "https://api.example.com/v1" },
          { description: "Server without URL", url: undefined as any },
          { url: "https://backup.example.com/v1" },
        ],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([
        "https://api.example.com/v1",
        "https://backup.example.com/v1",
      ]);
    });

    it("should filter out servers with empty URLs", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        servers: [
          { url: "https://api.example.com/v1" },
          { url: "" },
          { url: "https://backup.example.com/v1" },
        ],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([
        "https://api.example.com/v1",
        "https://backup.example.com/v1",
      ]);
    });

    it("should handle single server", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        servers: [{ url: "https://api.example.com/v1" }],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual(["https://api.example.com/v1"]);
    });
  });

  describe("extractAllOperations", () => {
    it("should extract single operation", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        method: "get",
        operation: expect.objectContaining({
          operationId: "getUsers",
        }),
        operationId: "getUsers",
        pathKey: "/users",
        pathLevelParameters: [],
      });
    });

    it("should extract multiple operations from same path", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
            post: {
              operationId: "createUser",
              responses: { "201": { description: "Created" } },
            },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(2);
      expect(result[0].method).toBe("get");
      expect(result[0].operationId).toBe("getUsers");
      expect(result[1].method).toBe("post");
      expect(result[1].operationId).toBe("createUser");
    });

    it("should extract operations from multiple paths", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/posts": {
            get: {
              operationId: "getPosts",
              responses: { "200": { description: "Success" } },
            },
          },
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(2);
      expect(result[0].pathKey).toBe("/posts");
      expect(result[1].pathKey).toBe("/users");
    });

    it("should handle all HTTP methods", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            delete: { operationId: "deleteUser", responses: {} },
            get: { operationId: "getUsers", responses: {} },
            patch: { operationId: "patchUser", responses: {} },
            post: { operationId: "createUser", responses: {} },
            put: { operationId: "updateUser", responses: {} },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(5);
      const methods = result.map((r) => r.method);
      expect(methods).toEqual(["get", "post", "put", "delete", "patch"]);
    });

    it("should include path-level parameters", () => {
      const pathLevelParam: ParameterObject = {
        in: "header",
        name: "version",
        required: true,
        schema: { type: "string" },
      };

      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
            parameters: [pathLevelParam],
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(1);
      expect(result[0].pathLevelParameters).toEqual([pathLevelParam]);
    });

    it("should handle paths without operations", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            description: "Operations for managing users",
            summary: "User operations",
          },
        },
      };

      const result = extractAllOperations(doc);
      expect(result).toHaveLength(0);
    });

    it("should handle document without paths", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
      };

      const result = extractAllOperations(doc);
      expect(result).toHaveLength(0);
    });

    it("should handle empty paths object", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {},
      };

      const result = extractAllOperations(doc);
      expect(result).toHaveLength(0);
    });

    it("should handle path with no path-level parameters", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(1);
      expect(result[0].pathLevelParameters).toEqual([]);
    });

    it("should handle mixed operations - some with missing operationId", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
            post: {
              // Missing operationId - will be generated by applyGeneratedOperationIds
              responses: { "201": { description: "Created" } },
            } as OperationObject,
          },
        },
      };

      // Set operationId to undefined explicitly
      (doc.paths!["/users"] as PathItemObject).post!.operationId = undefined;

      // Apply generated operation IDs before extraction
      applyGeneratedOperationIds(doc);

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(2); // Both operations are included
      expect(result[0].operationId).toBe("getUsers");
      expect(result[1].operationId).toBeDefined(); // Should have generated operationId
      expect(result[1].operationId).toBe("postUsers"); // Expected generated ID
    });

    it("should preserve operation order based on HTTP method order", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {
          "/users": {
            delete: { operationId: "deleteUser", responses: {} },
            get: { operationId: "getUsers", responses: {} },
            patch: { operationId: "patchUser", responses: {} },
            post: { operationId: "createUser", responses: {} },
            put: { operationId: "updateUser", responses: {} },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(5);
      // Should be in the order defined in the httpMethods array
      const methods = result.map((r) => r.method);
      expect(methods).toEqual(["get", "post", "put", "delete", "patch"]);
    });
  });

  describe("extractRequestContentTypes", () => {
    it("should extract all request content types", () => {
      const requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/User" },
          },
          "application/x-www-form-urlencoded": {
            schema: {
              type: "object",
              properties: { name: { type: "string" } },
            },
          },
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: { file: { type: "string", format: "binary" } },
            },
          },
        },
      };

      const result = extractRequestContentTypes(requestBody);

      expect(result.isRequired).toBe(true);
      expect(result.contentTypes).toHaveLength(3);
      expect(result.contentTypes[0].contentType).toBe("application/json");
      expect(result.contentTypes[0].schema).toEqual({
        $ref: "#/components/schemas/User",
      });
      expect(result.contentTypes[1].contentType).toBe(
        "application/x-www-form-urlencoded",
      );
      expect(result.contentTypes[2].contentType).toBe("multipart/form-data");
    });

    it("should handle optional request body", () => {
      const requestBody = {
        required: false,
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };

      const result = extractRequestContentTypes(requestBody);

      expect(result.isRequired).toBe(false);
      expect(result.contentTypes).toHaveLength(1);
    });

    it("should handle empty content", () => {
      const requestBody = {
        required: true,
        content: {},
      };

      const result = extractRequestContentTypes(requestBody);

      expect(result.isRequired).toBe(true);
      expect(result.contentTypes).toHaveLength(0);
    });
  });

  describe("extractResponseContentTypes", () => {
    it("should extract all response content types", () => {
      const operation: OperationObject = {
        operationId: "testOp",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
              "application/xml": {
                schema: { type: "string" },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
              "text/plain": {
                schema: { type: "string" },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation);

      expect(result).toHaveLength(2);

      // Check 200 response
      expect(result[0].statusCode).toBe("200");
      expect(result[0].contentTypes).toHaveLength(2);
      expect(result[0].contentTypes[0].contentType).toBe("application/json");
      expect(result[0].contentTypes[1].contentType).toBe("application/xml");

      // Check 404 response
      expect(result[1].statusCode).toBe("404");
      expect(result[1].contentTypes).toHaveLength(2);
      expect(result[1].contentTypes[0].contentType).toBe("application/json");
      expect(result[1].contentTypes[1].contentType).toBe("text/plain");
    });

    it("should include default responses", () => {
      const operation: OperationObject = {
        operationId: "testOp",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation);

      expect(result).toHaveLength(2);
      expect(result[0].statusCode).toBe("200");
      expect(result[1].statusCode).toBe("default");
    });

    it("should handle responses without content", () => {
      const operation: OperationObject = {
        operationId: "testOp",
        responses: {
          "204": {
            description: "No Content",
          },
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation);

      expect(result).toHaveLength(1);
      expect(result[0].statusCode).toBe("200");
    });
  });
});
