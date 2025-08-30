import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";

describe("error handling in client generator", () => {
  describe("ApiResponseError integration", () => {
    it("should include ApiResponseError in return type for operations with responses", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should include ApiResponseError in the union */
      expect(result.returnType).toContain("ApiResponseError");
      expect(result.returnType).toBe(
        "ApiResponseWithParse<200, typeof GetUserResponseMap> | ApiResponseError",
      );
    });

    it("should include ApiResponseError in return type for operations without responses", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should return only ApiResponseError when no responses defined */
      expect(result.returnType).toBe("ApiResponseError");
    });

    it("should include ApiResponseError for mixed response types", () => {
      const operation: OperationObject = {
        operationId: "mixedOperation",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
              },
            },
            description: "Success",
          },
          "204": {
            description: "No Content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should include both response types and ApiResponseError */
      expect(result.returnType).toContain("ApiResponseWithParse<200");
      expect(result.returnType).toContain("ApiResponse<204, void>");
      expect(result.returnType).toContain("ApiResponseError");
      expect(result.returnType).toBe(
        "ApiResponseWithParse<200, typeof MixedOperationResponseMap> | ApiResponse<204, void> | ApiResponseError",
      );
    });
  });

  describe("response handler parse method error handling", () => {
    it("should generate parse method that calls parseApiResponseUnknownData", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "TestOperationResponseMap",
        false,
      );

      /* Should include parse method that calls parseApiResponseUnknownData */
      const responseHandler = result.responseHandlers[0];
      expect(responseHandler).toContain("parse: () =>");
      expect(responseHandler).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, TestOperationResponseMap",
      );
      expect(responseHandler).not.toContain(
        "createApiResponseErrorFromParseResult",
      );
    });

    it("should generate force validation handlers that return errors", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "TestOperationResponseMap",
        true,
      );

      /* Should include error handling in force validation mode */
      const responseHandler = result.responseHandlers[0];
      expect(responseHandler).toContain(
        "const parseResult = parseApiResponseUnknownData",
      );
      expect(responseHandler).toContain('if ("parsed" in parseResult)');
      expect(responseHandler).toContain("if (parseResult.kind");
      expect(responseHandler).toContain("success: false");
      /* Force validation should directly return parsed result or error, not provide a parse method */
    });
  });

  describe("error type consistency", () => {
    it("should maintain consistent error handling across different operation types", () => {
      const operations = [
        {
          name: "simple response",
          operation: {
            operationId: "simple",
            responses: {
              "200": { description: "Success" },
            },
          },
        },
        {
          name: "schema response",
          operation: {
            operationId: "withSchema",
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Data" },
                  },
                },
                description: "Success",
              },
            },
          },
        },
        {
          name: "multiple responses",
          operation: {
            operationId: "multiple",
            responses: {
              "200": { description: "Success" },
              "404": { description: "Not Found" },
              "500": { description: "Server Error" },
            },
          },
        },
      ];

      for (const { name, operation } of operations) {
        const typeImports = new Set<string>();
        const result = generateResponseHandlers(operation, typeImports);

        /* All operations should include ApiResponseError in their return type */
        expect(
          result.returnType,
          `${name} should include ApiResponseError`,
        ).toContain("ApiResponseError");
      }
    });
  });
});
