import { describe, it, expect } from "vitest";
import {
  extractServerUrls,
  extractAllOperations,
} from "../../src/client-generator/operation-extractor.js";
import type {
  OpenAPIObject,
  PathItemObject,
  OperationObject,
  ParameterObject,
} from "openapi3-ts/oas31";

describe("client-generator operation-extractor", () => {
  describe("extractServerUrls", () => {
    it("should extract all server URLs", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
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
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when servers array is empty", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        servers: [],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual([]);
    });

    it("should filter out servers with undefined URLs", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        servers: [
          { url: "https://api.example.com/v1" },
          { url: undefined as any, description: "Server without URL" },
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
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
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
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        servers: [{ url: "https://api.example.com/v1" }],
      };

      const result = extractServerUrls(doc);
      expect(result).toEqual(["https://api.example.com/v1"]);
    });
  });

  describe("extractAllOperations", () => {
    it("should extract single operation", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
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
        pathKey: "/users",
        method: "get",
        operation: expect.objectContaining({
          operationId: "getUsers",
        }),
        pathLevelParameters: [],
        operationId: "getUsers",
      });
    });

    it("should extract multiple operations from same path", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
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
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
          },
          "/posts": {
            get: {
              operationId: "getPosts",
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(2);
      expect(result[0].pathKey).toBe("/users");
      expect(result[1].pathKey).toBe("/posts");
    });

    it("should handle all HTTP methods", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: { operationId: "getUsers", responses: {} },
            post: { operationId: "createUser", responses: {} },
            put: { operationId: "updateUser", responses: {} },
            delete: { operationId: "deleteUser", responses: {} },
            patch: { operationId: "patchUser", responses: {} },
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
        name: "version",
        in: "header",
        required: true,
        schema: { type: "string" },
      };

      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            parameters: [pathLevelParam],
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
          },
        },
      };

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(1);
      expect(result[0].pathLevelParameters).toEqual([pathLevelParam]);
    });

    it("should handle paths without operations", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            summary: "User operations",
            description: "Operations for managing users",
          },
        },
      };

      const result = extractAllOperations(doc);
      expect(result).toHaveLength(0);
    });

    it("should handle document without paths", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
      };

      const result = extractAllOperations(doc);
      expect(result).toHaveLength(0);
    });

    it("should handle empty paths object", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const result = extractAllOperations(doc);
      expect(result).toHaveLength(0);
    });

    it("should handle path with no path-level parameters", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
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
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              operationId: "getUsers",
              responses: { "200": { description: "Success" } },
            },
            post: {
              // Missing operationId - should still be processed as undefined will be provided
              responses: { "201": { description: "Created" } },
            } as OperationObject,
          },
        },
      };

      // Set operationId to undefined explicitly
      (doc.paths!["/users"] as PathItemObject).post!.operationId = undefined;

      const result = extractAllOperations(doc);

      expect(result).toHaveLength(2); // Both operations are included even without operationId
      expect(result[0].operationId).toBe("getUsers");
      expect(result[1].operationId).toBeUndefined();
    });

    it("should preserve operation order based on HTTP method order", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            patch: { operationId: "patchUser", responses: {} },
            get: { operationId: "getUsers", responses: {} },
            delete: { operationId: "deleteUser", responses: {} },
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
});
