import { describe, expect, it } from "vitest";

import {
  renderParseExpression,
  renderResponseHandler,
  renderResponseHandlers,
  renderUnionType,
  renderApiResponseType,
} from "../../src/client-generator/templates/response-templates.js";
import type { ResponseInfo } from "../../src/client-generator/models/response-models.js";

describe("response-templates", () => {
  describe("renderParseExpression", () => {
    it("should render JSON validation expression", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "200",
        typeName: "User",
        contentType: "application/json",
        hasSchema: true,
        parsingStrategy: {
          useValidation: true,
          isJsonLike: true,
          requiresRuntimeContentTypeCheck: false,
        },
      };

      const result = renderParseExpression(responseInfo, {
        statusCode: "200",
        typeName: "User",
        hasResponseContentTypeMap: false,
      });

      expect(result).toContain("User.safeParse(await parseResponseBody(response))");
      expect(result).toContain("if (!parseResult.success)");
      expect(result).toContain("return { status: 200 as const, error: parseResult.error, response }");
      expect(result).toContain("const data = parseResult.data;");
    });

    it("should render non-JSON expression without validation", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "200",
        typeName: "FileContent",
        contentType: "text/plain",
        hasSchema: true,
        parsingStrategy: {
          useValidation: false,
          isJsonLike: false,
          requiresRuntimeContentTypeCheck: false,
        },
      };

      const result = renderParseExpression(responseInfo, {
        statusCode: "200",
        typeName: "FileContent",
        hasResponseContentTypeMap: false,
      });

      expect(result).toBe("const data = await parseResponseBody(response) as FileContent;");
    });

    it("should render mixed content type expression with runtime check", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "200",
        typeName: "Data",
        contentType: "application/json",
        hasSchema: true,
        parsingStrategy: {
          useValidation: true,
          isJsonLike: true,
          requiresRuntimeContentTypeCheck: true,
        },
      };

      const result = renderParseExpression(responseInfo, {
        statusCode: "200",
        typeName: "Data",
        hasResponseContentTypeMap: true,
      });

      expect(result).toContain("let data: Data;");
      expect(result).toContain('if (finalResponseContentType.includes("json")');
      expect(result).toContain("Data.safeParse(await parseResponseBody(response))");
      expect(result).toContain("} else {");
      expect(result).toContain("data = await parseResponseBody(response) as Data;");
    });

    it("should render undefined for response without schema", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "204",
        typeName: null,
        contentType: null,
        hasSchema: false,
        parsingStrategy: {
          useValidation: false,
          isJsonLike: false,
          requiresRuntimeContentTypeCheck: false,
        },
      };

      const result = renderParseExpression(responseInfo, {
        statusCode: "204",
        typeName: "",
        hasResponseContentTypeMap: false,
      });

      expect(result).toBe("const data = undefined;");
    });
  });

  describe("renderResponseHandler", () => {
    it("should render handler with parse expression", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "200",
        typeName: "User",
        contentType: "application/json",
        hasSchema: true,
        parsingStrategy: {
          useValidation: true,
          isJsonLike: true,
          requiresRuntimeContentTypeCheck: false,
        },
      };

      const parseExpression = "const parseResult = User.safeParse(await parseResponseBody(response));\\nconst data = parseResult.data;";
      const result = renderResponseHandler(responseInfo, parseExpression);

      expect(result).toContain("case 200: {");
      expect(result).toContain("User.safeParse(await parseResponseBody(response))");
      expect(result).toContain("return { status: 200 as const, data, response };");
      expect(result).toContain("}");
    });

    it("should render handler without content", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "204",
        typeName: null,
        contentType: null,
        hasSchema: false,
        parsingStrategy: {
          useValidation: false,
          isJsonLike: false,
          requiresRuntimeContentTypeCheck: false,
        },
      };

      const result = renderResponseHandler(responseInfo, "undefined");

      expect(result).toContain("case 204:");
      expect(result).toContain("return { status: 204 as const, data: undefined, response };");
      expect(result).not.toContain("{");
    });

    it("should handle undefined parse expression", () => {
      const responseInfo: ResponseInfo = {
        statusCode: "200",
        typeName: "Data",
        contentType: "application/octet-stream",
        hasSchema: false,
        parsingStrategy: {
          useValidation: false,
          isJsonLike: false,
          requiresRuntimeContentTypeCheck: false,
        },
      };

      const result = renderResponseHandler(responseInfo, "undefined");

      expect(result).toContain("case 200: {");
      expect(result).toContain("const data = undefined; // data = undefined");
      expect(result).toContain("return { status: 200 as const, data, response };");
    });
  });

  describe("renderResponseHandlers", () => {
    it("should render multiple response handlers", () => {
      const responses: ResponseInfo[] = [
        {
          statusCode: "200",
          typeName: "User",
          contentType: "application/json",
          hasSchema: true,
          parsingStrategy: {
            useValidation: true,
            isJsonLike: true,
            requiresRuntimeContentTypeCheck: false,
          },
        },
        {
          statusCode: "404",
          typeName: null,
          contentType: null,
          hasSchema: false,
          parsingStrategy: {
            useValidation: false,
            isJsonLike: false,
            requiresRuntimeContentTypeCheck: false,
          },
        },
      ];

      const result = renderResponseHandlers(responses);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain("case 200:");
      expect(result[0]).toContain("User.safeParse");
      expect(result[1]).toContain("case 404:");
      expect(result[1]).toContain("data: undefined");
    });

    it("should handle empty responses array", () => {
      const result = renderResponseHandlers([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("renderUnionType", () => {
    it("should render union type from components", () => {
      const unionTypes = [
        "ApiResponse<200, User>",
        "ApiResponse<404, Error>",
      ];

      const result = renderUnionType(unionTypes);

      expect(result).toBe("ApiResponse<200, User> | ApiResponse<404, Error>");
    });

    it("should render default type for empty union", () => {
      const result = renderUnionType([]);
      expect(result).toBe("ApiResponse<number, unknown>");
    });

    it("should render custom default type", () => {
      const result = renderUnionType([], "never");
      expect(result).toBe("never");
    });

    it("should render single union type", () => {
      const result = renderUnionType(["ApiResponse<200, User>"]);
      expect(result).toBe("ApiResponse<200, User>");
    });
  });

  describe("renderApiResponseType", () => {
    it("should render ApiResponse type", () => {
      const result = renderApiResponseType("200", "User");
      expect(result).toBe("ApiResponse<200, User>");
    });

    it("should handle void type", () => {
      const result = renderApiResponseType("204", "void");
      expect(result).toBe("ApiResponse<204, void>");
    });

    it("should handle unknown type", () => {
      const result = renderApiResponseType("500", "unknown");
      expect(result).toBe("ApiResponse<500, unknown>");
    });
  });
});