import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";

describe("force validation flag", () => {
  describe("generateResponseHandlers with dynamic forceValidation", () => {
    it("should generate response handlers with conditional logic for both validation modes", () => {
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
        false, // forceValidation parameter is now ignored
      );

      /* Verify response handler includes conditional logic for both modes */
      expect(result.responseHandlers[0]).toContain(
        "if (config.forceValidation)",
      );
      expect(result.responseHandlers[0]).toContain(
        "/* Force validation: automatically parse and return result */",
      );
      expect(result.responseHandlers[0]).toContain(
        "/* Manual validation: provide parse method */",
      );
      expect(result.responseHandlers[0]).toContain(
        "parse: () => parseApiResponseUnknownData",
      );
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        "config.deserializers ?? {}",
      );

      /* Verify return type uses conditional types */
      expect(result.returnType).toBe(
        "(TForceValidation extends true ? ApiResponseWithForcedParse<200, typeof GetUserResponseMap> : ApiResponseWithParse<200, typeof GetUserResponseMap>) | ApiResponse<404, void> | ApiResponseError",
      );
    });

    it("should generate conditional response handlers that support both modes", () => {
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
        true, // forceValidation parameter is now ignored, should generate same result
      );

      /* Verify response handler includes conditional logic for both force and manual validation */
      expect(result.responseHandlers[0]).toContain(
        "if (config.forceValidation)",
      );
      expect(result.responseHandlers[0]).toContain("const parseResult =");
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        'if ("parsed" in parseResult)',
      );
      expect(result.responseHandlers[0]).toContain("parsed: parseResult");
      expect(result.responseHandlers[0]).toContain("if (parseResult.kind)");
      expect(result.responseHandlers[0]).toContain("success: false");

      /* Should also contain manual validation branch */
      expect(result.responseHandlers[0]).toContain("} else {");
      expect(result.responseHandlers[0]).toContain("parse: () =>");

      /* Verify return type uses conditional types */
      expect(result.returnType).toBe(
        "(TForceValidation extends true ? ApiResponseWithForcedParse<200, typeof GetUserResponseMap> : ApiResponseWithParse<200, typeof GetUserResponseMap>) | ApiResponse<404, void> | ApiResponseError",
      );
    });

    it("should not add conditional logic for responses without schemas", () => {
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
        true, // forceValidation parameter is now ignored
      );

      /* Verify no conditional parsing logic is added for responses without schemas */
      expect(result.responseHandlers[0]).not.toContain(
        "config.forceValidation",
      );
      expect(result.responseHandlers[0]).not.toContain("const parseResult =");
      expect(result.responseHandlers[0]).not.toContain("parsed");
      expect(result.responseHandlers[0]).not.toContain("parse:");
    });
  });
});
