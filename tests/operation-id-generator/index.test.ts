import type { OpenAPIObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  applyGeneratedOperationIds,
  generateOperationId,
  generateUniqueOperationIds,
  getOrGenerateOperationId,
} from "../../src/operation-id-generator/index.js";

describe("generateOperationId", () => {
  it("should generate ID from method and simple path", () => {
    const result = generateOperationId("GET", "/users");
    expect(result).toBe("getUsers");
  });

  it("should generate ID from method and nested path", () => {
    const result = generateOperationId("POST", "/users/profile");
    expect(result).toBe("postUsersProfile");
  });

  it("should handle parameter paths", () => {
    const result = generateOperationId("GET", "/users/{userId}");
    expect(result).toBe("getUsersUserId");
  });

  it("should handle complex paths with parameters", () => {
    const result = generateOperationId("PUT", "/users/{userId}/posts/{postId}");
    expect(result).toBe("putUsersUserIdPostsPostId");
  });

  it("should handle hyphenated paths", () => {
    const result = generateOperationId("GET", "/user-profiles");
    expect(result).toBe("getUserProfiles");
  });

  it("should handle special characters in paths", () => {
    const result = generateOperationId("GET", "/api/v1/user_accounts");
    expect(result).toBe("getApiV1UserAccounts"); // Underscores are removed as special chars
  });

  it("should handle uppercase methods", () => {
    const result = generateOperationId("POST", "/users");
    expect(result).toBe("postUsers");
  });

  it("should handle empty path", () => {
    const result = generateOperationId("GET", "/");
    expect(result).toBe("getSchema"); // sanitizeIdentifier falls back to "Schema" for empty result
  });

  it("should handle root path", () => {
    const result = generateOperationId("GET", "");
    expect(result).toBe("getSchema"); // sanitizeIdentifier falls back to "Schema" for empty result
  });

  it("should handle paths with numbers", () => {
    const result = generateOperationId("GET", "/api/v2/users123");
    expect(result).toBe("getApiV2Users123");
  });
});

describe("getOrGenerateOperationId", () => {
  it("should return existing operationId when present", () => {
    const operation = { operationId: "customListUsers" };
    const result = getOrGenerateOperationId(operation, "GET", "/users");
    expect(result).toBe("customListUsers");
  });

  it("should generate operationId when not present", () => {
    const operation = {};
    const result = getOrGenerateOperationId(operation, "GET", "/users");
    expect(result).toBe("getUsers");
  });

  it("should sanitize existing operationId", () => {
    const operation = { operationId: "list-users" };
    const result = getOrGenerateOperationId(operation, "GET", "/users");
    expect(result).toBe("listUsers");
  });

  it("should handle empty operationId", () => {
    const operation = { operationId: "" };
    const result = getOrGenerateOperationId(operation, "GET", "/users");
    expect(result).toBe("getUsers");
  });
});

describe("generateUniqueOperationIds", () => {
  it("should generate unique IDs for non-colliding operations", () => {
    const paths = {
      "/posts": {
        get: {},
      },
      "/users": {
        get: {},
        post: {},
      },
    };

    const result = generateUniqueOperationIds(paths);

    expect(result.get("get:/users")).toBe("getUsers");
    expect(result.get("post:/users")).toBe("postUsers");
    expect(result.get("get:/posts")).toBe("getPosts");
  });

  it("should handle collisions by adding numbers", () => {
    // Create paths that will generate the same operation ID
    const paths = {
      "/profile": {
        get: { operationId: "getUsers" }, // Explicit same ID
      },
      "/user": {
        get: { operationId: "getUsers" }, // Explicit same ID
      },
    };

    const result = generateUniqueOperationIds(paths);

    // The collision should be resolved with numbers
    const values = Array.from(result.values());
    expect(values).toContain("getUsers");
    expect(values).toContain("getUsers2");
  });

  it("should handle existing operationIds", () => {
    const paths = {
      "/users": {
        get: { operationId: "listAllUsers" },
        post: {},
      },
    };

    const result = generateUniqueOperationIds(paths);

    expect(result.get("get:/users")).toBe("listAllUsers");
    expect(result.get("post:/users")).toBe("postUsers");
  });

  it("should handle empty paths object", () => {
    const result = generateUniqueOperationIds({});
    expect(result.size).toBe(0);
  });

  it("should process all object properties, not just HTTP methods", () => {
    const paths = {
      "/users": {
        customObject: {}, // Objects are processed
        deprecated: true, // Primitives are not objects so ignored
        get: {},
        parameters: [{ name: "test" }], // Arrays are objects so will be processed
        summary: "User endpoints", // Strings are not objects so ignored
      },
    };

    const result = generateUniqueOperationIds(paths);

    expect(result.size).toBe(3); // get, parameters, and customObject
    expect(result.get("get:/users")).toBe("getUsers");
    expect(result.get("parameters:/users")).toBe("parametersUsers");
    expect(result.get("customObject:/users")).toBe("customobjectUsers");
  });

  it("should handle multiple collisions", () => {
    const paths = {
      "/user": { get: {} },
      "/user_list": { get: {} }, // All these might generate similar IDs
      "/users": { get: {} },
    };

    const result = generateUniqueOperationIds(paths);

    expect(result.size).toBe(3);
    const values = Array.from(result.values());
    expect(values).toHaveLength(3);
    // All values should be unique
    expect(new Set(values).size).toBe(3);
  });
});

describe("applyGeneratedOperationIds", () => {
  it("should add missing operationIds to OpenAPI document", () => {
    const openApiDoc: OpenAPIObject = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {
        "/posts": {
          get: {},
        },
        "/users": {
          get: {},
          post: { operationId: "createUser" }, // Already has ID
        },
      },
    };

    applyGeneratedOperationIds(openApiDoc);

    expect(openApiDoc.paths!["/users"]!.get!.operationId).toBe("getUsers");
    expect(openApiDoc.paths!["/users"]!.post!.operationId).toBe("createUser"); // Unchanged
    expect(openApiDoc.paths!["/posts"]!.get!.operationId).toBe("getPosts");
  });

  it("should handle document without paths", () => {
    const openApiDoc: OpenAPIObject = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
    };

    expect(() => applyGeneratedOperationIds(openApiDoc)).not.toThrow();
  });

  it("should handle empty paths object", () => {
    const openApiDoc: OpenAPIObject = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {},
    };

    expect(() => applyGeneratedOperationIds(openApiDoc)).not.toThrow();
  });

  it("should handle all HTTP methods", () => {
    const openApiDoc: OpenAPIObject = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {
        "/users": {
          delete: {},
          get: {},
          patch: {},
          post: {},
          put: {},
        },
      },
    };

    applyGeneratedOperationIds(openApiDoc);

    expect(openApiDoc.paths!["/users"]!.get!.operationId).toBe("getUsers");
    expect(openApiDoc.paths!["/users"]!.post!.operationId).toBe("postUsers");
    expect(openApiDoc.paths!["/users"]!.put!.operationId).toBe("putUsers");
    expect(openApiDoc.paths!["/users"]!.delete!.operationId).toBe(
      "deleteUsers",
    );
    expect(openApiDoc.paths!["/users"]!.patch!.operationId).toBe("patchUsers");
  });

  it("should not overwrite existing operationIds", () => {
    const openApiDoc: OpenAPIObject = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {
        "/users": {
          get: { operationId: "listUsers" },
        },
      },
    };

    applyGeneratedOperationIds(openApiDoc);

    expect(openApiDoc.paths!["/users"]!.get!.operationId).toBe("listUsers");
  });

  it("should handle paths with only non-operation objects", () => {
    const openApiDoc: OpenAPIObject = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {
        "/users": {
          parameters: [{ in: "query", name: "test" }],
        },
      },
    };

    expect(() => applyGeneratedOperationIds(openApiDoc)).not.toThrow();
  });
});
