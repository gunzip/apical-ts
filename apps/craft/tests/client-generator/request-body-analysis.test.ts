import { describe, expect, it } from "vitest";

import type { RequestBodyObject } from "openapi3-ts/oas31";

import {
  determineContentTypeStrategy,
  determineRequestBodyStructure,
  getRequestBodyContentType,
  prioritizeContentTypes,
} from "../../src/client-generator/request-body.js";

describe("Request Body Analysis Functions", () => {
  describe("prioritizeContentTypes", () => {
    it("should prioritize types according to preference order", () => {
      const availableTypes = [
        "text/plain",
        "application/json",
        "application/xml",
      ];

      const result = prioritizeContentTypes(availableTypes);

      expect(result.selectedType).toBe("application/json");
      expect(result.prioritizedTypes).toEqual([
        "application/json",
        "text/plain",
        "application/xml",
      ]);
    });

    it("should include all available types even if not in preferences", () => {
      const availableTypes = ["application/custom", "text/csv"];

      const result = prioritizeContentTypes(availableTypes);

      expect(result.selectedType).toBe("application/custom");
      expect(result.prioritizedTypes).toEqual([
        "application/custom",
        "text/csv",
      ]);
      expect(result.availableTypes).toEqual(["application/custom", "text/csv"]);
    });

    it("should use fallback type when no types available", () => {
      const result = prioritizeContentTypes([]);

      expect(result.selectedType).toBe("application/json");
      expect(result.prioritizedTypes).toEqual([]);
    });

    it("should respect custom priority configuration", () => {
      const availableTypes = ["text/plain", "application/json"];
      const customPriority = {
        preferredTypes: ["text/plain"],
        fallbackType: "text/html",
      };

      const result = prioritizeContentTypes(availableTypes, customPriority);

      expect(result.selectedType).toBe("text/plain");
    });
  });

  describe("determineContentTypeStrategy", () => {
    it("should return correct strategy for application/json", () => {
      const strategy = determineContentTypeStrategy("application/json");

      expect(strategy.bodyProcessing).toBe(
        "body ? JSON.stringify(body) : undefined",
      );
      expect(strategy.contentTypeHeader).toBe(
        '"Content-Type": "application/json"',
      );
      expect(strategy.requiresFormData).toBe(false);
    });

    it("should return correct strategy for multipart/form-data", () => {
      const strategy = determineContentTypeStrategy("multipart/form-data");

      expect(strategy.bodyProcessing).toContain("FormData");
      expect(strategy.contentTypeHeader).toBe("");
      expect(strategy.requiresFormData).toBe(true);
    });

    it("should return fallback strategy for unknown content type", () => {
      const strategy = determineContentTypeStrategy("application/custom");

      expect(strategy.bodyProcessing).toBe(
        "typeof body === 'string' ? body : JSON.stringify(body)",
      );
      expect(strategy.contentTypeHeader).toBe(
        '"Content-Type": "application/custom"',
      );
      expect(strategy.requiresFormData).toBe(false);
    });
  });

  describe("getRequestBodyContentType", () => {
    it("should return fallback when no content", () => {
      const requestBody: RequestBodyObject = {};

      const result = getRequestBodyContentType(requestBody);

      expect(result).toBe("application/json");
    });

    it("should prioritize application/json over other types", () => {
      const requestBody: RequestBodyObject = {
        content: {
          "application/xml": { schema: { type: "string" } },
          "application/json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
      };

      const result = getRequestBodyContentType(requestBody);

      expect(result).toBe("application/json");
    });

    it("should return first available type when no preferred types present", () => {
      const requestBody: RequestBodyObject = {
        content: {
          "application/custom": { schema: { type: "string" } },
        },
      };

      const result = getRequestBodyContentType(requestBody);

      expect(result).toBe("application/custom");
    });
  });

  describe("determineRequestBodyStructure", () => {
    it("should return correct structure when no request body", () => {
      const result = determineRequestBodyStructure(undefined, "testOp");

      expect(result.hasBody).toBe(false);
      expect(result.isRequired).toBe(false);
      expect(result.contentType).toBe("application/json");
      expect(result.typeInfo).toBeNull();
    });

    it("should determine structure for request body with content", () => {
      const requestBody: RequestBodyObject = {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TestSchema" },
          },
        },
      };

      const result = determineRequestBodyStructure(requestBody, "testOp");

      expect(result.hasBody).toBe(true);
      expect(result.isRequired).toBe(true);
      expect(result.contentType).toBe("application/json");
      expect(result.strategy.bodyProcessing).toBe(
        "body ? JSON.stringify(body) : undefined",
      );
      expect(result.typeInfo).toBeDefined();
      expect(result.typeInfo?.typeName).toBe("TestSchema");
    });

    it("should handle inline schemas correctly", () => {
      const requestBody: RequestBodyObject = {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { name: { type: "string" } },
            },
          },
        },
      };

      const result = determineRequestBodyStructure(requestBody, "createUser");

      expect(result.hasBody).toBe(true);
      expect(result.isRequired).toBe(false);
      expect(result.typeInfo?.typeName).toBe("CreateUserRequest");
    });
  });
});
