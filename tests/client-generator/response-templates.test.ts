import { describe, expect, it } from "vitest";

import {
  renderResponseHandler,
  renderResponseHandlers,
  renderUnionType,
} from "../../src/client-generator/templates/response-templates.js";
import type { ResponseInfo } from "../../src/client-generator/models/response-models.js";

describe("response-templates", () => {
  describe("renderResponseHandler", () => {
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
      expect(result).toContain(
        "return { success: true as const, status: 204 as const, data: undefined, response };",
      );
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
      expect(result).toContain("const data = undefined");
      expect(result).toContain(
        "return { success: true as const, status: 200 as const, data, response };",
      );
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
      const unionTypes = ["ApiResponse<200, User>", "ApiResponse<404, Error>"];

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
});
