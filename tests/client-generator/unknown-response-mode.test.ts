import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";
import { renderParseExpression } from "../../src/client-generator/templates/response-templates.js";
import type { ResponseInfo } from "../../src/client-generator/models/response-models.js";

describe("unknown response mode", () => {
  describe("renderParseExpression with forceUnknownMode", () => {
    it("should generate unknown parsing for JSON response with schema", () => {
      const responseInfo: ResponseInfo = {
        contentType: "application/json",
        hasSchema: true,
        parsingStrategy: {
          isJsonLike: true,
          requiresRuntimeContentTypeCheck: false,
          useValidation: true,
        },
        statusCode: "200",
        typeName: "User",
      };

      const result = renderParseExpression(responseInfo, {
        hasResponseContentTypeMap: false,
        statusCode: "200",
        typeName: "User",
        forceUnknownMode: true,
      });

      expect(result).toBe(
        "const data = await parseResponseBody(response) as unknown;",
      );
    });

    it("should generate undefined for response without schema", () => {
      const responseInfo: ResponseInfo = {
        contentType: null,
        hasSchema: false,
        parsingStrategy: {
          isJsonLike: false,
          requiresRuntimeContentTypeCheck: false,
          useValidation: false,
        },
        statusCode: "204",
        typeName: null,
      };

      const result = renderParseExpression(responseInfo, {
        hasResponseContentTypeMap: false,
        statusCode: "204",
        typeName: "",
        forceUnknownMode: true,
      });

      expect(result).toBe("const data = undefined;");
    });
  });

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
      expect(result.responseHandlers[0]).toContain(
        "parse: (deserializerMap?: GetUserResponseDeserializerMap) =>",
      );
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(response, data, GetUserResponseMap",
      );

      /* Verify unknown parsing is used */
      expect(result.responseHandlers[0]).toContain(
        "const data = await parseResponseBody(response) as unknown;",
      );

      /* Verify no Zod validation */
      expect(result.responseHandlers[0]).not.toContain("safeParse");

      /* Verify return type uses unknown for responses with content and void for others */
      expect(result.returnType).toBe(
        "ApiResponse<200, unknown> | ApiResponse<404, void>",
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
      expect(result.responseHandlers[0]).toContain(
        "parse: (deserializerMap?: GetPetResponseDeserializerMap) =>",
      );
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(response, data, GetPetResponseMap",
      );
    });
  });
});
