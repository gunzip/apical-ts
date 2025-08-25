import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  generateResponseHandlers,
} from "../../src/client-generator/responses.js";

describe("client-generator validation error handling", () => {
  describe("generateResponseHandlers with safeParse", () => {
    it("should generate handler code that returns parseError object on validation failure", () => {
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

      /* Verify that the generated code includes safeParse and parseError handling */
      expect(result.responseHandlers[0]).toContain("safeParse(");
      expect(result.responseHandlers[0]).toContain("if (!parseResult.success)");
      expect(result.responseHandlers[0]).toContain("return { parseError: parseResult.error }");
      expect(result.responseHandlers[0]).toContain("return parseResult.data");
      
      /* Verify that the return type includes parseError possibility */
      expect(result.returnType).toContain("{ parseError: import(\"zod\").ZodError }");
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

      /* Verify that the generated code includes conditional safeParse logic */
      expect(result.responseHandlers[0]).toContain("finalResponseContentType.includes(\"json\")");
      expect(result.responseHandlers[0]).toContain("safeParse(");
      expect(result.responseHandlers[0]).toContain("parseError: parseResult.error");
      
      /* Verify that the return type includes parseError possibility */
      expect(result.returnType).toContain("{ parseError: import(\"zod\").ZodError }");
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
      expect(result.responseHandlers[0]).not.toContain("parseError");
      expect(result.responseHandlers[0]).toContain("as FileContent");
      
      /* Verify that the return type does NOT include parseError */
      expect(result.returnType).not.toContain("parseError");
      expect(result.returnType).toBe("ApiResponse<200, FileContent>");
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