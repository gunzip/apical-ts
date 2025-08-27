import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";
import { renderApiResponseTypes } from "../../src/client-generator/templates/config-templates.js";

describe("precise ApiResponse types", () => {
  describe("ApiResponseWithParse type generation", () => {
    it("should generate ApiResponseWithParse helper types", () => {
      const result = renderApiResponseTypes();

      /* Should include helper type for extracting models from response maps */
      expect(result).toContain("ResponseModelsForStatus<");
      expect(result).toContain(
        "Map extends Record<string, Record<string, any>>",
      );
      expect(result).toContain("Status extends keyof Map");
      expect(result).toContain("Map[Status][keyof Map[Status]]");

      /* Should include precise ApiResponseWithParse type */
      expect(result).toContain("ApiResponseWithParse<");
      expect(result).toContain("readonly parse: (");
      expect(result).toContain(
        "ReturnType<typeof parseApiResponseUnknownData>",
      );

      /* Should not use any or unknown in parse return type */
      expect(result).not.toMatch(/parse:.*unknown/);
      expect(result).not.toMatch(/parse:.*any(?!>)/); // Don't match 'any' in generic bounds
    });

    it("should use precise deserializer map type", () => {
      const result = renderApiResponseTypes();

      /* Should use proper deserializer map type */
      expect(result).toContain("Partial<Record<string, Deserializer>>");
    });
  });

  describe("operation return type generation", () => {
    it("should generate ApiResponseWithParse types for operations with response maps", () => {
      const operation: OperationObject = {
        operationId: "testMultiContentTypes",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NewModel" },
              },
              "application/xml": {
                schema: { $ref: "#/components/schemas/NewModel" },
              },
            },
          },
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Book" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should generate precise ApiResponseWithParse types */
      expect(result.returnType).toContain(
        "ApiResponseWithParse<200, typeof TestMultiContentTypesResponseMap>",
      );
      expect(result.returnType).toContain(
        "ApiResponseWithParse<201, typeof TestMultiContentTypesResponseMap>",
      );

      /* Should not contain generic ApiResponse types */
      expect(result.returnType).not.toContain("ApiResponse<200, unknown>");
      expect(result.returnType).not.toContain("ApiResponse<201, unknown>");

      /* Should have response map information */
      expect(result.responseMapName).toBe("TestMultiContentTypesResponseMap");
    });

    it("should use standard ApiResponse for responses without schemas", () => {
      const operation: OperationObject = {
        operationId: "deleteResource",
        responses: {
          "204": {
            description: "No Content",
          },
          "404": {
            description: "Not Found",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should use standard ApiResponse for responses without content */
      expect(result.returnType).toContain("ApiResponse<204, void>");
      expect(result.returnType).toContain("ApiResponse<404, void>");

      /* Should not use ApiResponseWithParse for responses without schemas */
      expect(result.returnType).not.toContain("ApiResponseWithParse");
    });

    it("should mix precise and standard types appropriately", () => {
      const operation: OperationObject = {
        operationId: "mixedOperation",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
              },
            },
          },
          "204": {
            description: "No Content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should use precise type for 200 (has schema) */
      expect(result.returnType).toContain(
        "ApiResponseWithParse<200, typeof MixedOperationResponseMap>",
      );

      /* Should use standard type for 204 (no content) */
      expect(result.returnType).toContain("ApiResponse<204, void>");
    });

    it("should fall back to standard types when no operation ID", () => {
      const operation: OperationObject = {
        /* No operationId */
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Data" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports);

      /* Should fall back to standard ApiResponse when no operationId */
      expect(result.returnType).toContain("ApiResponse<200, unknown>");
      expect(result.returnType).not.toContain("ApiResponseWithParse");

      /* Should not have response map when no operationId */
      expect(result.responseMapName).toBeUndefined();
    });
  });
});
