import { describe, expect, it } from "vitest";

import {
  CONTENT_TYPE_HANDLERS,
  determineContentTypeHandlers,
  renderContentTypeSwitch,
  type ContentTypeHandler,
} from "../../src/client-generator/templates/content-type-templates.js";

describe("content-type-templates", () => {
  describe("CONTENT_TYPE_HANDLERS", () => {
    it("should define handlers for all supported content types", () => {
      const expectedContentTypes = [
        "application/json",
        "application/octet-stream",
        "application/x-www-form-urlencoded",
        "application/xml",
        "multipart/form-data",
        "text/plain",
      ];

      for (const contentType of expectedContentTypes) {
        expect(CONTENT_TYPE_HANDLERS[contentType]).toBeDefined();
        expect(CONTENT_TYPE_HANDLERS[contentType].bodyContentCode).toMatch(
          /bodyContent = /,
        );
        expect(
          CONTENT_TYPE_HANDLERS[contentType].contentTypeHeaderCode,
        ).toMatch(/contentTypeHeader = /);
      }
    });

    it("should have correct JSON handler", () => {
      const handler = CONTENT_TYPE_HANDLERS["application/json"];
      expect(handler.bodyContentCode).toBe(
        "bodyContent = body ? JSON.stringify(body) : undefined;",
      );
      expect(handler.contentTypeHeaderCode).toBe(
        'contentTypeHeader = { "Content-Type": "application/json" };',
      );
    });

    it("should have correct multipart/form-data handler", () => {
      const handler = CONTENT_TYPE_HANDLERS["multipart/form-data"];
      expect(handler.bodyContentCode).toContain(
        "const formData = new FormData()",
      );
      expect(handler.contentTypeHeaderCode).toBe(
        "contentTypeHeader = {}; // Don't set Content-Type for multipart/form-data",
      );
    });
  });

  describe("determineContentTypeHandlers", () => {
    it("should return known handlers for recognized content types", () => {
      const contentTypes = ["application/json", "application/xml"];
      const result = determineContentTypeHandlers(contentTypes);

      expect(result).toHaveLength(2);
      expect(result[0].contentType).toBe("application/json");
      expect(result[0].handler).toBe(CONTENT_TYPE_HANDLERS["application/json"]);
      expect(result[1].contentType).toBe("application/xml");
      expect(result[1].handler).toBe(CONTENT_TYPE_HANDLERS["application/xml"]);
    });

    it("should return generic handlers for unknown content types", () => {
      const contentTypes = ["application/custom"];
      const result = determineContentTypeHandlers(contentTypes);

      expect(result).toHaveLength(1);
      expect(result[0].contentType).toBe("application/custom");
      expect(result[0].handler.bodyContentCode).toBe(
        "bodyContent = typeof body === 'string' ? body : JSON.stringify(body);",
      );
      expect(result[0].handler.contentTypeHeaderCode).toBe(
        'contentTypeHeader = { "Content-Type": "application/custom" };',
      );
    });

    it("should handle empty content types array", () => {
      const result = determineContentTypeHandlers([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("renderContentTypeSwitch", () => {
    it("should generate switch statement for known content types", () => {
      const contentTypes = ["application/json", "text/plain"];
      const result = renderContentTypeSwitch(contentTypes);

      expect(result).toContain(
        'let bodyContent: string | FormData | undefined = "";',
      );
      expect(result).toContain("let contentTypeHeader = {};");
      expect(result).toContain("switch (finalRequestContentType) {");
      expect(result).toContain('case "application/json":');
      expect(result).toContain('case "text/plain":');
      expect(result).toContain("default:");
      expect(result).toContain(
        "bodyContent = typeof body === 'string' ? body : JSON.stringify(body);",
      );
      expect(result).toContain(
        'contentTypeHeader = { "Content-Type": finalRequestContentType };',
      );
    });

    it("should generate switch statement for unknown content types", () => {
      const contentTypes = ["application/custom"];
      const result = renderContentTypeSwitch(contentTypes);

      expect(result).toContain('case "application/custom":');
      expect(result).toContain(
        "bodyContent = typeof body === 'string' ? body : JSON.stringify(body);",
      );
      expect(result).toContain(
        'contentTypeHeader = { "Content-Type": "application/custom" };',
      );
    });

    it("should handle empty content types array", () => {
      const result = renderContentTypeSwitch([]);

      expect(result).toContain(
        'let bodyContent: string | FormData | undefined = "";',
      );
      expect(result).toContain("let contentTypeHeader = {};");
      expect(result).toContain("switch (finalRequestContentType) {");
      expect(result).toContain("default:");
      expect(result).not.toContain('case "');
    });

    it("should generate proper case structure for each content type", () => {
      const contentTypes = ["application/json"];
      const result = renderContentTypeSwitch(contentTypes);

      expect(result).toContain('    case "application/json":');
      expect(result).toContain(
        "      bodyContent = body ? JSON.stringify(body) : undefined;",
      );
      expect(result).toContain(
        '      contentTypeHeader = { "Content-Type": "application/json" };',
      );
      expect(result).toContain("      break;");
    });
  });
});
