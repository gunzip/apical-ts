import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { analyzeResponseStructure } from "../../src/client-generator/response-analysis.js";
import { generateResponseHandlers } from "../../src/client-generator/responses.js";
import { generateDiscriminatedUnionTypes } from "../../src/client-generator/discriminated-union-generator.js";

describe("discriminated union response types", () => {
  describe("generateDiscriminatedUnionTypes", () => {
    it("should generate discriminated union types for multiple content types", () => {
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
              "application/vnd.custom+json": {
                schema: { $ref: "#/components/schemas/NewModel" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateDiscriminatedUnionTypes(
        operation,
        "testMultiContentTypes",
        typeImports,
      );

      /* Should generate union type name */
      expect(result.unionTypeName).toBe("TestMultiContentTypesResponse");

      /* Should include all content type pairs */
      expect(result.unionTypeDefinition).toContain("application/json");
      expect(result.unionTypeDefinition).toContain("application/xml");
      expect(result.unionTypeDefinition).toContain("application/vnd.custom+json");

      /* Should include status and contentType fields */
      expect(result.unionTypeDefinition).toContain("status: 200");
      expect(result.unionTypeDefinition).toContain("contentType:");
      expect(result.unionTypeDefinition).toContain("data:");

      /* Should use z.infer for type inference */
      expect(result.unionTypeDefinition).toContain("import(\"zod\").infer<typeof");

      /* Should generate response map */
      expect(result.responseMapName).toBe("TestMultiContentTypesResponseMap");
      expect(result.responseMapType).toContain("NewModel");

      /* Should not add z import since we use import qualifier */
      expect(typeImports.has("z")).toBe(false);
    });

    it("should handle void responses correctly", () => {
      const operation: OperationObject = {
        operationId: "deleteResource",
        responses: {
          "204": {
            description: "No content",
          },
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Resource" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateDiscriminatedUnionTypes(
        operation,
        "deleteResource",
        typeImports,
      );

      /* Should handle void response */
      expect(result.unionTypeDefinition).toContain('contentType: ""');
      expect(result.unionTypeDefinition).toContain("data: void");
      expect(result.unionTypeDefinition).toContain("status: 204");

      /* Should also handle content response */
      expect(result.unionTypeDefinition).toContain("status: 200");
      expect(result.unionTypeDefinition).toContain("application/json");
    });
  });

  describe("analyzeResponseStructure", () => {
    it("should include discriminated union information", () => {
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
        },
      };

      const typeImports = new Set<string>();
      const result = analyzeResponseStructure({
        operation,
        typeImports,
        hasResponseContentTypeMap: true,
      });

      /* Should include discriminated union information */
      expect(result.discriminatedUnionTypeName).toBe("TestMultiContentTypesResponse");
      expect(result.discriminatedUnionTypeDefinition).toBeTruthy();
      expect(result.responseMapName).toBe("TestMultiContentTypesResponseMap");
      expect(result.responseMapType).toBeTruthy();

      /* Should analyze responses correctly */
      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].statusCode).toBe("200");
      expect(result.responses[0].hasSchema).toBe(true);
    });

    it("should handle operations without operationId", () => {
      const operation: OperationObject = {
        /* No operationId */
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Model" },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = analyzeResponseStructure({
        operation,
        typeImports,
        hasResponseContentTypeMap: true,
      });

      /* Should not have discriminated union information */
      expect(result.discriminatedUnionTypeName).toBeUndefined();
      expect(result.discriminatedUnionTypeDefinition).toBeUndefined();
      expect(result.responseMapName).toBeUndefined();
      expect(result.responseMapType).toBeUndefined();

      /* Should still analyze responses */
      expect(result.responses).toHaveLength(1);
    });
  });

  describe("generateResponseHandlers", () => {
    it("should include discriminated union information in result", () => {
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
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "TestMultiContentTypesResponseMap",
      );

      /* Should include discriminated union information */
      expect(result.discriminatedUnionTypeName).toBe("TestMultiContentTypesResponse");
      expect(result.discriminatedUnionTypeDefinition).toBeTruthy();
      expect(result.responseMapName).toBe("TestMultiContentTypesResponseMap");
      expect(result.responseMapType).toBeTruthy();

      /* Should generate response handlers */
      expect(result.responseHandlers).toHaveLength(1);
      
      /* Should include parse method in handler */
      expect(result.responseHandlers[0]).toContain("parse:");
      expect(result.responseHandlers[0]).toContain("parseApiResponseUnknownData");
      
      /* Return type should still be ApiResponse for backward compatibility */
      expect(result.returnType).toContain("ApiResponse<200, unknown>");
    });
  });
});