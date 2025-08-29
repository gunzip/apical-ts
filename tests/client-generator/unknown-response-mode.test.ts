import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";

describe("unknown response mode", () => {
  describe("generateResponseHandlers with unknown mode", () => {
    it("should generate response handlers with parse methods", () => {
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
      );

      /* Verify response handler includes parse method */
      expect(result.responseHandlers[0]).toContain("parse: () =>");
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        "config.deserializerMap ?? {}",
      );

      /* Verify unknown parsing is used */
      expect(result.responseHandlers[0]).not.toContain(
        "const data = undefined",
      );

      /* Verify no Zod validation */
      expect(result.responseHandlers[0]).not.toContain("safeParse");

      /* Verify return type uses precise types for responses with content and void for others */
      expect(result.returnType).toBe(
        "ApiResponseWithParse<200, typeof GetUserResponseMap> | ApiResponse<404, void>",
      );
    });

    it("should not add parse method for responses without schemas", () => {
      const operation: OperationObject = {
        operationId: "deleteUser",
        responses: {
          "204": {
            description: "No content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(operation, typeImports, false);

      /* Verify no parse method is added */
      expect(result.responseHandlers[0]).not.toContain("parse: () =>");
      expect(result.responseHandlers[0]).not.toContain(
        "parseApiResponseUnknownData",
      );
    });

    it("should handle multiple content types with schema map", () => {
      const operation: OperationObject = {
        operationId: "getPet",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet",
                },
              },
              "application/xml": {
                schema: {
                  $ref: "#/components/schemas/Pet",
                },
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
        "GetPetResponseMap",
      );

      /* Verify parse method is included */
      expect(result.responseHandlers[0]).toContain("parse: () =>");
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetPetResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        "config.deserializerMap ?? {}",
      );
    });
  });
});
