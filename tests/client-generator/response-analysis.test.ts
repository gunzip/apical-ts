import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  analyzeContentTypes,
  determineParsingStrategy,
  buildResponseTypeInfo,
  analyzeResponseStructure,
} from "../../src/client-generator/response-analysis.js";

describe("response-analysis", () => {
  describe("analyzeContentTypes", () => {
    it("should identify JSON-like content types", () => {
      const response: ResponseObject = {
        description: "Success",
        content: {
          "application/json": { schema: { type: "object" } },
          "application/vnd.api+json": { schema: { type: "object" } },
        },
      };

      const result = analyzeContentTypes(response);

      expect(result.hasJsonLike).toBe(true);
      expect(result.hasNonJson).toBe(false);
      expect(result.hasMixedContentTypes).toBe(false);
      expect(result.allContentTypes).toEqual([
        "application/json",
        "application/vnd.api+json",
      ]);
    });

    it("should identify non-JSON content types", () => {
      const response: ResponseObject = {
        description: "Success",
        content: {
          "text/plain": { schema: { type: "string" } },
          "application/xml": { schema: { type: "string" } },
        },
      };

      const result = analyzeContentTypes(response);

      expect(result.hasJsonLike).toBe(false);
      expect(result.hasNonJson).toBe(true);
      expect(result.hasMixedContentTypes).toBe(false);
      expect(result.allContentTypes).toEqual(["text/plain", "application/xml"]);
    });

    it("should identify mixed content types", () => {
      const response: ResponseObject = {
        description: "Success",
        content: {
          "application/json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
      };

      const result = analyzeContentTypes(response);

      expect(result.hasJsonLike).toBe(true);
      expect(result.hasNonJson).toBe(true);
      expect(result.hasMixedContentTypes).toBe(true);
      expect(result.allContentTypes).toEqual([
        "application/json",
        "text/plain",
      ]);
    });

    it("should handle response with no content", () => {
      const response: ResponseObject = {
        description: "No Content",
      };

      const result = analyzeContentTypes(response);

      expect(result.hasJsonLike).toBe(false);
      expect(result.hasNonJson).toBe(false);
      expect(result.hasMixedContentTypes).toBe(false);
      expect(result.allContentTypes).toEqual([]);
    });
  });

  describe("determineParsingStrategy", () => {
    it("should enable validation for JSON content with schema", () => {
      const strategy = determineParsingStrategy(
        "application/json",
        true,
        {
          hasJsonLike: true,
          hasNonJson: false,
          hasMixedContentTypes: false,
          allContentTypes: ["application/json"],
        },
        false,
      );

      expect(strategy.useValidation).toBe(true);
      expect(strategy.isJsonLike).toBe(true);
      expect(strategy.requiresRuntimeContentTypeCheck).toBe(false);
    });

    it("should disable validation for non-JSON content", () => {
      const strategy = determineParsingStrategy(
        "text/plain",
        true,
        {
          hasJsonLike: false,
          hasNonJson: true,
          hasMixedContentTypes: false,
          allContentTypes: ["text/plain"],
        },
        false,
      );

      expect(strategy.useValidation).toBe(false);
      expect(strategy.isJsonLike).toBe(false);
      expect(strategy.requiresRuntimeContentTypeCheck).toBe(false);
    });

    it("should enable runtime content type check for mixed content types", () => {
      const strategy = determineParsingStrategy(
        "application/json",
        true,
        {
          hasJsonLike: true,
          hasNonJson: true,
          hasMixedContentTypes: true,
          allContentTypes: ["application/json", "text/plain"],
        },
        true,
      );

      expect(strategy.useValidation).toBe(true);
      expect(strategy.isJsonLike).toBe(true);
      expect(strategy.requiresRuntimeContentTypeCheck).toBe(true);
    });

    it("should disable validation when no schema is present", () => {
      const strategy = determineParsingStrategy(
        "application/json",
        false,
        {
          hasJsonLike: true,
          hasNonJson: false,
          hasMixedContentTypes: false,
          allContentTypes: ["application/json"],
        },
        false,
      );

      expect(strategy.useValidation).toBe(false);
      expect(strategy.isJsonLike).toBe(true);
      expect(strategy.requiresRuntimeContentTypeCheck).toBe(false);
    });
  });

  describe("buildResponseTypeInfo", () => {
    it("should build info for response with reference schema", () => {
      const response: ResponseObject = {
        description: "Success",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/User" },
          },
        },
      };

      const operation: OperationObject = {
        operationId: "getUser",
        responses: { "200": response },
      };

      const typeImports = new Set<string>();
      const result = buildResponseTypeInfo(
        "200",
        response,
        operation,
        typeImports,
        false,
      );

      expect(result.statusCode).toBe("200");
      expect(result.typeName).toBe("User");
      expect(result.contentType).toBe("application/json");
      expect(result.hasSchema).toBe(true);
      expect(result.parsingStrategy.useValidation).toBe(true);
      expect(result.parsingStrategy.isJsonLike).toBe(true);
      expect(typeImports.has("User")).toBe(true);
    });

    it("should build info for response with inline schema", () => {
      const response: ResponseObject = {
        description: "Created",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { id: { type: "string" } },
            },
          },
        },
      };

      const operation: OperationObject = {
        operationId: "createUser",
        responses: { "201": response },
      };

      const typeImports = new Set<string>();
      const result = buildResponseTypeInfo(
        "201",
        response,
        operation,
        typeImports,
        false,
      );

      expect(result.statusCode).toBe("201");
      expect(result.typeName).toBe("CreateUser201Response");
      expect(result.contentType).toBe("application/json");
      expect(result.hasSchema).toBe(true);
      expect(typeImports.has("CreateUser201Response")).toBe(true);
    });

    it("should handle response without content", () => {
      const response: ResponseObject = {
        description: "No Content",
      };

      const operation: OperationObject = {
        operationId: "deleteUser",
        responses: { "204": response },
      };

      const typeImports = new Set<string>();
      const result = buildResponseTypeInfo(
        "204",
        response,
        operation,
        typeImports,
        false,
      );

      expect(result.statusCode).toBe("204");
      expect(result.typeName).toBeNull();
      expect(result.contentType).toBeNull();
      expect(result.hasSchema).toBe(false);
      expect(result.parsingStrategy.useValidation).toBe(false);
    });
  });

  describe("analyzeResponseStructure", () => {
    it("should analyze operation with multiple responses", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = analyzeResponseStructure({
        operation,
        typeImports,
        hasResponseContentTypeMap: false,
      });

      expect(result.responses).toHaveLength(2);
      expect(result.responses[0].statusCode).toBe("200");
      expect(result.responses[0].typeName).toBe("User");
      expect(result.responses[1].statusCode).toBe("404");
      expect(result.responses[1].typeName).toBe("Error");

      expect(result.unionTypes).toEqual([
        "ApiResponseWithParse<200, typeof GetUserResponseMap>",
        "ApiResponseWithParse<404, typeof GetUserResponseMap>",
        "ApiResponseError",
      ]);

      expect(typeImports.has("User")).toBe(true);
      expect(typeImports.has("Error")).toBe(true);
    });

    it("should handle operation with no responses", () => {
      const operation: OperationObject = {
        operationId: "testOp",
      };

      const typeImports = new Set<string>();
      const result = analyzeResponseStructure({
        operation,
        typeImports,
      });

      expect(result.responses).toHaveLength(0);
      expect(result.unionTypes).toHaveLength(1); // Should contain ApiResponseError
      expect(result.unionTypes).toEqual(["ApiResponseError"]);
      expect(result.defaultReturnType).toBe("ApiResponse<number, unknown>");
    });

    it("should sort response codes numerically", () => {
      const operation: OperationObject = {
        operationId: "testOp",
        responses: {
          "500": { description: "Server Error" },
          "200": { description: "Success" },
          "404": { description: "Not Found" },
        },
      };

      const typeImports = new Set<string>();
      const result = analyzeResponseStructure({
        operation,
        typeImports,
      });

      expect(result.responses[0].statusCode).toBe("200");
      expect(result.responses[1].statusCode).toBe("404");
      expect(result.responses[2].statusCode).toBe("500");
    });
  });
});
