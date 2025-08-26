import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  generateResponseHandlers,
  generateContentTypeMaps,
  type ResponseHandlerResult,
  type ResponseTypeInfo,
} from "../../src/client-generator/responses.js";

describe("client-generator responses", () => {
  describe("generateResponseHandlers", () => {
    it("should generate handler for response with $ref schema", () => {
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

      expect(result.returnType).toBe("ApiResponse<200, unknown>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 200:");
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );
      expect(typeImports.has("User")).toBe(true);
    });

    it("should generate handler for response with inline schema", () => {
      const operation: OperationObject = {
        operationId: "createUser",
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: {
                  properties: {
                    id: { type: "string" },
                  },
                  type: "object",
                },
              },
            },
            description: "Created",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<201, unknown>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain("case 201:");
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );
      expect(typeImports.has("CreateUser201Response")).toBe(true);
    });

    it("should generate handler for multiple response codes", () => {
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
          "404": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
            description: "Not found",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe(
        "ApiResponse<200, unknown> | ApiResponse<404, unknown>",
      );
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

      expect(result.returnType).toBe("ApiResponse<200, unknown>");
      expect(result.responseHandlers).toHaveLength(1);
      expect(result.responseHandlers[0]).toContain(
        "await parseResponseBody(response) as unknown",
      );
      expect(typeImports.has("FileContent")).toBe(true);
    });

    it("should handle response with unknown content type", () => {
      const operation: OperationObject = {
        operationId: "getData",
        responses: {
          "200": {
            content: {
              "application/octet-stream": {},
            },
            description: "Success",
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
          "200": { description: "Success" },
          "404": { description: "Not found" },
          "500": { description: "Server error" },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe(
        "ApiResponse<200, void> | ApiResponse<404, void> | ApiResponse<500, void>",
      );
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
            content: {
              "application/json": {
                schema: {
                  properties: { name: { type: "string" } },
                  type: "object",
                },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, unknown>");
      expect(typeImports.has("UserProfileData200Response")).toBe(true);
    });

    it("should handle JSON-like content types", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": {
            content: {
              "application/vnd.api+json": {
                schema: { $ref: "#/components/schemas/ApiData" },
              },
            },
            description: "Success",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      expect(result.returnType).toBe("ApiResponse<200, unknown>");
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );
      expect(typeImports.has("ApiData")).toBe(true);
    });

    it("should handle response with multiple content types", () => {
      const operation: OperationObject = {
        operationId: "testOperation",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
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
      const result = generateResponseHandlers(operation, typeImports);

      // Should prefer JSON content type (getResponseContentType logic)
      expect(result.returnType).toBe("ApiResponse<200, unknown>");
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );
      expect(typeImports.has("Data")).toBe(true);
    });
  });

  describe("generateContentTypeMaps", () => {
    it("should generate content type maps for operation with multiple request and response types", () => {
      const operation: OperationObject = {
        operationId: "petFindByStatus",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Pet" },
            },
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Pet" },
                },
              },
              "application/xml": {
                schema: { type: "string" },
              },
            },
          },
          "404": {
            description: "Not Found",
            content: {
              "text/plain": {
                schema: { type: "string" },
              },
            },
          },
        },
      };

      const result = generateContentTypeMaps(operation);

      expect(result.defaultRequestContentType).toBe("application/json");
      expect(result.defaultResponseContentType).toBe("application/json");

      // Check request map
      expect(result.requestMapType).toContain('"application/json": Pet;');
      expect(result.requestMapType).toContain(
        '"application/x-www-form-urlencoded": PetFindByStatusRequest;',
      );

      // Check response map
      expect(result.responseMapType).toContain(
        '"application/json": PetFindByStatus200Response,',
      );
      expect(result.responseMapType).toContain(
        '"application/xml": PetFindByStatus200Response,',
      );
      expect(result.responseMapType).toContain(
        '"text/plain": PetFindByStatus404Response,',
      );

      // Check counts
      expect(result.requestContentTypeCount).toBe(2);
      expect(result.responseContentTypeCount).toBe(3);

      // Check type imports
      expect(result.typeImports.has("Pet")).toBe(true);
      expect(result.typeImports.has("PetFindByStatusRequest")).toBe(true);
      expect(result.typeImports.has("PetFindByStatus200Response")).toBe(true);
      expect(result.typeImports.has("PetFindByStatus404Response")).toBe(true);
    });

    it("should handle operation with no request body", () => {
      const operation: OperationObject = {
        operationId: "getUsers",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      };

      const result = generateContentTypeMaps(operation);

      expect(result.defaultRequestContentType).toBeNull();
      expect(result.defaultResponseContentType).toBe("application/json");
      expect(result.requestMapType).toBe("{}");
      expect(result.requestContentTypeCount).toBe(0);
      expect(result.responseContentTypeCount).toBe(1);
      expect(result.responseMapType).toContain('"application/json": User,');
    });

    it("should handle operation with no responses", () => {
      const operation: OperationObject = {
        operationId: "deleteUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        responses: {},
      };

      const result = generateContentTypeMaps(operation);

      expect(result.defaultRequestContentType).toBe("application/json");
      expect(result.defaultResponseContentType).toBeNull();
      expect(result.requestContentTypeCount).toBe(1);
      expect(result.responseContentTypeCount).toBe(0);
      expect(result.requestMapType).toContain('"application/json": User;');
      expect(result.responseMapType).toBe("{}");
    });

    it("should handle empty operation", () => {
      const operation: OperationObject = {
        operationId: "emptyOp",
        responses: {},
      };

      const result = generateContentTypeMaps(operation);

      expect(result.defaultRequestContentType).toBeNull();
      expect(result.defaultResponseContentType).toBeNull();
      expect(result.requestContentTypeCount).toBe(0);
      expect(result.responseContentTypeCount).toBe(0);
      expect(result.requestMapType).toBe("{}");
      expect(result.responseMapType).toBe("{}");
    });
  });
});
