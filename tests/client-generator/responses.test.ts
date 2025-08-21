import { describe, it, expect } from "vitest";
import {
  generateResponseHandlers,
  type ResponseTypeInfo,
  type ResponseHandlerResult,
} from "../../src/client-generator/responses.js";
import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

describe("client-generator responses", () => {
  describe("generateResponseHandlers", () => {
    it("should generate handler for response with $ref schema", () => {
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
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, User>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 200:");
      expect(result.responseHandlers[0]).toContain("User.parse(await parseResponseBody(response))");
      expect(typeImports.has("User")).toBe(true);
    });

    it("should generate handler for response with inline schema", () => {
      const operation: OperationObject = {
        operationId: "createUser",
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<201, CreateUser201Response>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 201:");
      expect(result.responseHandlers[0]).toContain("CreateUser201Response.parse(await parseResponseBody(response))");
      expect(typeImports.has("CreateUser201Response")).toBe(true);
    });

    it("should generate handler for multiple response codes", () => {
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
            description: "Not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, User> | ApiResponse<404, Error>");
      expect(result.responseHandlers).toHaveLength(2);
      expect(result.responseHandlers[0]).toContain("case 200:");
      expect(result.responseHandlers[1]).toContain("case 404:");
      expect(typeImports.has("User")).toBe(true);
      expect(typeImports.has("Error")).toBe(true);
    });

    it("should handle response without content", () => {
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

      expect(result.returnType).toBe("ApiResponse<204, void>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 204:");
      expect(result.responseHandlers[0]).toContain("data: undefined");
    });

    it("should handle non-JSON content types", () => {
      const operation: OperationObject = {
        operationId: "downloadFile",
        responses: {
          "200": {
            description: "File content",
            content: {
              "text/plain": {
                schema: { $ref: "#/components/schemas/FileContent" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, FileContent>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("await parseResponseBody(response) as FileContent");
      expect(typeImports.has("FileContent")).toBe(true);
    });

    it("should handle response with unknown content type", () => {
      const operation: OperationObject = {
        operationId: "getData",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/octet-stream": {},
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, unknown>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 200:");
      expect(result.responseHandlers[0]).toContain("data = undefined");
    });

    it("should sort response codes numerically", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "500": { description: "Server error" },
          "200": { description: "Success" },
          "404": { description: "Not found" },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, void> | ApiResponse<404, void> | ApiResponse<500, void>");
      // Check that handlers are sorted by status code
      expect(result.responseHandlers[0]).toContain("case 200:");
      expect(result.responseHandlers[1]).toContain("case 404:");
      expect(result.responseHandlers[2]).toContain("case 500:");
    });

    it("should ignore default response", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": { description: "Success" },
          default: { description: "Default response" },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, void>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 200:");
    });

    it("should handle operation without responses", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<number, unknown>");
      expect(result.responseHandlers).toHaveLength(0);
    });

    it("should handle empty responses object", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {},
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<number, unknown>");
      expect(result.responseHandlers).toHaveLength(0);
    });

    it("should sanitize operation ID for inline response type names", () => {
      const operation: OperationObject = {
        operationId: "user-profile-data",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, UserProfileData200Response>");
      expect(typeImports.has("UserProfileData200Response")).toBe(true);
    });

    it("should handle JSON-like content types", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/vnd.api+json": {
                schema: { $ref: "#/components/schemas/ApiData" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, ApiData>");
      expect(result.responseHandlers[0]).toContain("ApiData.parse(await parseResponseBody(response))");
      expect(typeImports.has("ApiData")).toBe(true);
    });

    it("should handle response with multiple content types", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
              },
              "text/plain": {
                schema: { type: "string" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      // Should prefer JSON content type (getResponseContentType logic)
      expect(result.returnType).toBe("ApiResponse<200, Data>");
      expect(result.responseHandlers[0]).toContain("Data.parse(await parseResponseBody(response))");
      expect(typeImports.has("Data")).toBe(true);
    });
  });
});