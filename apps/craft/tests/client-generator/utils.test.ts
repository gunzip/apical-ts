import type { ParameterObject, ResponseObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  generatePathInterpolation,
  getResponseContentType,
  toValidVariableName,
} from "../../src/client-generator/utils.js";

describe("client-generator utils", () => {
  describe("toValidVariableName", () => {
    it("should convert special characters to valid variable name", () => {
      expect(toValidVariableName("hello@world.com")).toBe("helloWorldCom");
      expect(toValidVariableName("test#name!")).toBe("testName");
    });

    it("should handle spaces", () => {
      expect(toValidVariableName("hello world")).toBe("helloWorld");
      expect(toValidVariableName("test  multiple   spaces")).toBe(
        "testMultipleSpaces",
      );
    });

    it("should handle numbers", () => {
      expect(toValidVariableName("test123")).toBe("test123");
      expect(toValidVariableName("123test")).toBe("123test");
    });

    it("should handle mixed characters", () => {
      expect(toValidVariableName("test-name_123@domain.com")).toBe(
        "testName_123DomainCom",
      );
    });

    it("should handle only special characters", () => {
      expect(toValidVariableName("@#$%")).toBe("");
    });

    it("should handle empty string", () => {
      expect(toValidVariableName("")).toBe("");
    });

    it("should handle multiple consecutive underscores", () => {
      expect(toValidVariableName("test___name")).toBe("testName");
    });

    it("should remove leading and trailing underscores", () => {
      expect(toValidVariableName("_test_name_")).toBe("testName");
    });

    it("should handle camelCase conversion after underscores", () => {
      expect(toValidVariableName("test_user_profile")).toBe("testUserProfile");
    });
  });

  describe("generatePathInterpolation", () => {
    it("should interpolate single path parameter", () => {
      const pathParams: ParameterObject[] = [
        { in: "path", name: "userId", required: true },
      ];

      const result = generatePathInterpolation("/users/{userId}", pathParams);
      expect(result).toBe(
        '/users/${serializePathParam("userId", params.path["userId"], { style: "simple", explode: true })}',
      );
    });

    it("should interpolate multiple path parameters", () => {
      const pathParams: ParameterObject[] = [
        { in: "path", name: "userId", required: true },
        { in: "path", name: "postId", required: true },
      ];

      const result = generatePathInterpolation(
        "/users/{userId}/posts/{postId}",
        pathParams,
      );
      expect(result).toBe(
        '/users/${serializePathParam("userId", params.path["userId"], { style: "simple", explode: true })}/posts/${serializePathParam("postId", params.path["postId"], { style: "simple", explode: true })}',
      );
    });

    it("should convert kebab-case parameter names to camelCase", () => {
      const pathParams: ParameterObject[] = [
        { in: "path", name: "user-id", required: true },
        { in: "path", name: "post-id", required: true },
      ];

      const result = generatePathInterpolation(
        "/users/{user-id}/posts/{post-id}",
        pathParams,
      );
      expect(result).toBe(
        '/users/${serializePathParam("user-id", params.path["user-id"], { style: "simple", explode: true })}/posts/${serializePathParam("post-id", params.path["post-id"], { style: "simple", explode: true })}',
      );
    });

    it("should handle paths with no parameters", () => {
      const result = generatePathInterpolation("/users", []);
      expect(result).toBe("/users");
    });

    it("should handle empty path", () => {
      const result = generatePathInterpolation("", []);
      expect(result).toBe("");
    });

    it("should handle parameters not in path", () => {
      const pathParams: ParameterObject[] = [
        { in: "path", name: "nonExistent", required: true },
      ];

      const result = generatePathInterpolation("/users/{userId}", pathParams);
      expect(result).toBe("/users/{userId}"); // Parameter not replaced since it's not in path
    });

    it("should handle complex parameter names", () => {
      const pathParams: ParameterObject[] = [
        { in: "path", name: "user_id", required: true },
        { in: "path", name: "complex-param-name", required: true },
      ];

      const result = generatePathInterpolation(
        "/users/{user_id}/data/{complex-param-name}",
        pathParams,
      );
      expect(result).toBe(
        '/users/${serializePathParam("user_id", params.path["user_id"], { style: "simple", explode: true })}/data/${serializePathParam("complex-param-name", params.path["complex-param-name"], { style: "simple", explode: true })}',
      ); // Now uses exact param names
    });
  });

  describe("getResponseContentType", () => {
    it("should return application/json when available", () => {
      const response: ResponseObject = {
        content: {
          "application/json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/json");
    });

    it("should return application/problem+json when application/json not available", () => {
      const response: ResponseObject = {
        content: {
          "application/problem+json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Error",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/problem+json");
    });

    it("should return other +json content types", () => {
      const response: ResponseObject = {
        content: {
          "application/vnd.api+json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/vnd.api+json");
    });

    it("should return first content type when no JSON types available", () => {
      const response: ResponseObject = {
        content: {
          "application/xml": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/xml"); // Should be first in object keys
    });

    it("should return null when no content defined", () => {
      const response: ResponseObject = {
        description: "No content",
      };

      const result = getResponseContentType(response);
      expect(result).toBeNull();
    });

    it("should return null when content is empty object", () => {
      const response: ResponseObject = {
        content: {},
        description: "Empty content",
      };

      const result = getResponseContentType(response);
      expect(result).toBeNull();
    });

    it("should prefer application/json over application/problem+json", () => {
      const response: ResponseObject = {
        content: {
          "application/json": { schema: { type: "object" } },
          "application/problem+json": { schema: { type: "object" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/json");
    });

    it("should handle custom JSON content types", () => {
      const response: ResponseObject = {
        content: {
          "application/vnd.custom+json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/vnd.custom+json");
    });
  });
});
