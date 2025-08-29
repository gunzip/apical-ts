import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";

describe("force validation flag", () => {
  describe("generateResponseHandlers with forceValidation", () => {
    it("should generate response handlers with parse methods when forceValidation is false", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "404": {
            description: "Not found",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "GetUserResponseMap",
        false, // forceValidation = false
      );

      /* Verify response handler includes parse method */
      expect(result.responseHandlers[0]).toContain("parse: () =>");
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        "config.deserializerMap ?? {}",
      );

      /* Verify response handler does NOT include automatic parsing */
      expect(result.responseHandlers[0]).not.toContain("const parsed =");
      expect(result.responseHandlers[0]).not.toContain("parsed");

      /* Verify return type uses ApiResponseWithParse */
      expect(result.returnType).toBe(
        "ApiResponseWithParse<200, typeof GetUserResponseMap> | ApiResponse<404, void>",
      );
    });

    it("should generate response handlers with parsed field when forceValidation is true", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "404": {
            description: "Not found",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "GetUserResponseMap",
        true, // forceValidation = true
      );

      /* Verify response handler includes automatic parsing */
      expect(result.responseHandlers[0]).toContain("const parsed =");
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        "config.deserializerMap ?? {}",
      );
      expect(result.responseHandlers[0]).toContain("parsed");

      /* Verify response handler does NOT include parse method */
      expect(result.responseHandlers[0]).not.toContain("parse:");

      /* Verify return type uses ApiResponseWithForcedParse */
      expect(result.returnType).toBe(
        "ApiResponseWithForcedParse<200, typeof GetUserResponseMap> | ApiResponse<404, void>",
      );
    });

    it("should not add parsed field for responses without schemas when forceValidation is true", () => {
      const operation: OperationObject = {
        operationId: "deleteUser",
        responses: {
          "204": {
            description: "No content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        false,
        undefined,
        true, // forceValidation = true
      );

      /* Verify no parsed field is added for responses without schemas */
      expect(result.responseHandlers[0]).not.toContain("const parsed =");
      expect(result.responseHandlers[0]).not.toContain("parsed");
      expect(result.responseHandlers[0]).not.toContain("parse:");
    });
  });
});
