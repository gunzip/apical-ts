import type { OperationObject, OpenAPIObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { extractResponseContentTypes } from "../../src/client-generator/operation-extractor.js";

describe("client-generator response references", () => {
  describe("extractResponseContentTypes", () => {
    it("should handle response with direct content schema", () => {
      const operation: OperationObject = {
        operationId: "testDirect",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Document",
                },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation);

      expect(result).toHaveLength(1);
      expect(result[0].statusCode).toBe("200");
      expect(result[0].contentTypes).toHaveLength(1);
      expect(result[0].contentTypes[0].contentType).toBe("application/json");
      expect(result[0].contentTypes[0].schema).toEqual({
        $ref: "#/components/schemas/Document",
      });
    });

    it("should handle response with $ref to components/responses when no document provided", () => {
      const operation: OperationObject = {
        operationId: "createDocument",
        responses: {
          "200": {
            $ref: "#/components/responses/DocumentResponse",
          },
        },
      };

      const result = extractResponseContentTypes(operation);

      // Without document, should skip reference objects
      expect(result).toHaveLength(0);
    });

    it("should resolve response with $ref to components/responses when document provided", () => {
      const operation: OperationObject = {
        operationId: "createDocument",
        responses: {
          "200": {
            $ref: "#/components/responses/DocumentResponse",
          },
        },
      };

      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        components: {
          responses: {
            DocumentResponse: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Document",
                  },
                },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation, doc);

      // With document, should resolve the reference and extract content
      expect(result).toHaveLength(1);
      expect(result[0].statusCode).toBe("200");
      expect(result[0].contentTypes).toHaveLength(1);
      expect(result[0].contentTypes[0].contentType).toBe("application/json");
      expect(result[0].contentTypes[0].schema).toEqual({
        $ref: "#/components/schemas/Document",
      });
    });

    it("should handle mixed direct and referenced responses", () => {
      const operation: OperationObject = {
        operationId: "mixedResponses",
        responses: {
          "200": {
            $ref: "#/components/responses/DocumentResponse",
          },
          "400": {
            description: "Bad Request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      };

      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        components: {
          responses: {
            DocumentResponse: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Document",
                  },
                },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation, doc);

      // Should extract both responses
      expect(result).toHaveLength(2);
      
      // Sort by status code for consistent testing
      const sortedResult = result.sort((a, b) => a.statusCode.localeCompare(b.statusCode));
      
      expect(sortedResult[0].statusCode).toBe("200");
      expect(sortedResult[0].contentTypes[0].contentType).toBe("application/json");
      expect(sortedResult[0].contentTypes[0].schema).toEqual({
        $ref: "#/components/schemas/Document",
      });
      
      expect(sortedResult[1].statusCode).toBe("400");
      expect(sortedResult[1].contentTypes[0].contentType).toBe("application/json");
      expect(sortedResult[1].contentTypes[0].schema).toEqual({
        $ref: "#/components/schemas/Error",
      });
    });

    it("should handle unresolvable response references gracefully", () => {
      const operation: OperationObject = {
        operationId: "unresolvableRef",
        responses: {
          "200": {
            $ref: "#/components/responses/NonExistentResponse",
          },
        },
      };

      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        components: {
          responses: {
            // DocumentResponse exists but NonExistentResponse doesn't
            DocumentResponse: {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Document",
                  },
                },
              },
            },
          },
        },
      };

      const result = extractResponseContentTypes(operation, doc);

      // Should skip unresolvable references
      expect(result).toHaveLength(0);
    });
  });
});