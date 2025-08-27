import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";

describe("client-generator validation error handling", () => {
  describe("generateResponseHandlers with safeParse", () => {
    it("should generate handler code that returns top-level error on validation failure", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Verify that the generated code uses unknown mode (no validation) */
      expect(result.responseHandlers[0]).not.toContain("safeParse(");
      expect(result.responseHandlers[0]).not.toContain(
        "if (!parseResult.success)",
      );
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );

      /* Return type should be ApiResponseWithParse with precise typing */
      expect(result.returnType).toBe("ApiResponseWithParse<200, typeof GetUserResponseMap>");
    });

    it("should generate handler code for mixed JSON/non-JSON responses with conditional validation", () => {
      const operation: OperationObject = {
        operationId: "getData",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JsonData" },
              },
              "text/plain": {
                schema: { type: "string" },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports, true);

      /* Verify that the generated code uses unknown mode (no conditional validation) */
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );
      expect(result.responseHandlers[0]).not.toContain("safeParse(");
      expect(result.responseHandlers[0]).not.toContain(
        "error: parseResult.error",
      );
      expect(result.returnType).toBe("ApiResponseWithParse<200, typeof GetDataResponseMap>");
    });

    it("should not include parseError for non-JSON responses", () => {
      const operation: OperationObject = {
        operationId: "downloadFile",
        responses: {
          "200": {
            content: {
              "text/plain": {
                schema: { $ref: "#/components/schemas/FileContent" },
              },
            },
            description: "File content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Verify that non-JSON responses don't use safeParse */
      expect(result.responseHandlers[0]).not.toContain("safeParse(");
      expect(result.responseHandlers[0]).not.toContain("error:");
      expect(result.responseHandlers[0]).toContain("as unknown");

      /* Verify that the return type does NOT include parseError */
      expect(result.returnType).not.toContain("error:");
      expect(result.returnType).toBe("ApiResponseWithParse<200, typeof DownloadFileResponseMap>");
    });

    it("should handle responses without content correctly", () => {
      const operation: OperationObject = {
        operationId: "deleteUser",
        responses: {
          "204": {
            description: "No content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Verify that responses without content don't include validation logic */
      expect(result.responseHandlers[0]).not.toContain("safeParse(");
      expect(result.responseHandlers[0]).not.toContain("parseError");
      expect(result.responseHandlers[0]).toContain("data: undefined");

      /* Verify that the return type is simple void without parseError */
      expect(result.returnType).toBe("ApiResponse<204, void>");
    });
  });
});
