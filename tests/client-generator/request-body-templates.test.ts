import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONTENT_TYPE_HANDLERS,
  renderBodyHandling,
  renderContentTypeHeaders,
  renderDynamicBodyHandling,
  renderLegacyRequestBodyHandling,
} from "../../src/client-generator/templates/request-body-templates.js";

describe("Request Body Template Functions", () => {
  describe("renderBodyHandling", () => {
    it("should render body handling with default indentation", () => {
      const strategy = DEFAULT_CONTENT_TYPE_HANDLERS["application/json"];

      const result = renderBodyHandling(strategy);

      expect(result).toBe("    body: body ? JSON.stringify(body) : undefined,");
    });

    it("should render body handling with custom indentation", () => {
      const strategy = DEFAULT_CONTENT_TYPE_HANDLERS["application/json"];

      const result = renderBodyHandling(strategy, "  ");

      expect(result).toBe("  body: body ? JSON.stringify(body) : undefined,");
    });

    it("should handle multipart/form-data correctly", () => {
      const strategy = DEFAULT_CONTENT_TYPE_HANDLERS["multipart/form-data"];

      const result = renderBodyHandling(strategy);

      expect(result).toContain("FormData");
      expect(result).toContain("formData.append");
    });
  });

  describe("renderContentTypeHeaders", () => {
    it("should render content type header with default indentation", () => {
      const strategy = DEFAULT_CONTENT_TYPE_HANDLERS["application/json"];

      const result = renderContentTypeHeaders(strategy);

      expect(result).toBe('    "Content-Type": "application/json",');
    });

    it("should render content type header with custom indentation", () => {
      const strategy = DEFAULT_CONTENT_TYPE_HANDLERS["application/json"];

      const result = renderContentTypeHeaders(strategy, "  ");

      expect(result).toBe('  "Content-Type": "application/json",');
    });

    it("should return empty string for multipart/form-data", () => {
      const strategy = DEFAULT_CONTENT_TYPE_HANDLERS["multipart/form-data"];

      const result = renderContentTypeHeaders(strategy);

      expect(result).toBe("");
    });
  });

  describe("renderLegacyRequestBodyHandling", () => {
    it("should return empty content when no body", () => {
      const context = {
        bodyContent: "",
        contentTypeHeader: "",
        hasBody: false,
        requestContentType: undefined,
      };

      const result = renderLegacyRequestBodyHandling(context);

      expect(result.bodyContent).toBe("");
      expect(result.contentTypeHeader).toBe("");
    });

    it("should render JSON body handling correctly", () => {
      const context = {
        bodyContent: "",
        contentTypeHeader: "",
        hasBody: true,
        requestContentType: "application/json",
      };

      const result = renderLegacyRequestBodyHandling(context);

      expect(result.bodyContent).toContain("JSON.stringify");
      expect(result.contentTypeHeader).toContain("application/json");
    });

    it("should handle unknown content types with fallback", () => {
      const context = {
        bodyContent: "",
        contentTypeHeader: "",
        hasBody: true,
        requestContentType: "application/custom",
      };

      const result = renderLegacyRequestBodyHandling(context);

      expect(result.bodyContent).toContain("JSON.stringify");
      expect(result.contentTypeHeader).toContain("application/custom");
    });

    it("should use custom handlers when provided", () => {
      const customHandlers = {
        "application/custom": {
          bodyProcessing: "custom processing",
          contentTypeHeader: '"Custom-Header": "value"',
          requiresFormData: false,
        },
      };

      const context = {
        bodyContent: "",
        contentTypeHeader: "",
        hasBody: true,
        requestContentType: "application/custom",
      };

      const result = renderLegacyRequestBodyHandling(context, customHandlers);

      expect(result.bodyContent).toContain("custom processing");
      expect(result.contentTypeHeader).toContain("Custom-Header");
    });
  });

  describe("renderDynamicBodyHandling", () => {
    it("should generate switch statement for multiple content types", () => {
      const contentTypes = ["application/json", "text/plain"];

      const result = renderDynamicBodyHandling(contentTypes);

      expect(result).toContain("switch (finalRequestContentType)");
      expect(result).toContain('case "application/json"');
      expect(result).toContain('case "text/plain"');
      expect(result).toContain("default:");
    });

    it("should handle single content type", () => {
      const contentTypes = ["application/json"];

      const result = renderDynamicBodyHandling(contentTypes);

      expect(result).toContain('case "application/json"');
      expect(result).toContain("JSON.stringify");
      expect(result).toContain("application/json");
    });

    it("should handle unknown content types with generic fallback", () => {
      const contentTypes = ["application/unknown"];

      const result = renderDynamicBodyHandling(contentTypes);

      expect(result).toContain('case "application/unknown"');
      expect(result).toContain("JSON.stringify");
      expect(result).toContain("application/unknown");
    });

    it("should use custom handlers when provided", () => {
      const customHandlers = {
        "application/custom": {
          bodyProcessing: "customProcess(body)",
          contentTypeHeader: '"X-Custom": "value"',
          requiresFormData: false,
        },
      };

      const result = renderDynamicBodyHandling(
        ["application/custom"],
        customHandlers,
      );

      expect(result).toContain("customProcess(body)");
      expect(result).toContain("X-Custom");
    });

    it("should generate proper variable declarations", () => {
      const result = renderDynamicBodyHandling(["application/json"]);

      expect(result).toContain(
        "let bodyContent: string | FormData | undefined = ",
      );
      expect(result).toContain("let contentTypeHeader = {}");
    });
  });

  describe("DEFAULT_CONTENT_TYPE_HANDLERS", () => {
    it("should have handlers for all common content types", () => {
      const expectedTypes = [
        "application/json",
        "application/octet-stream",
        "application/x-www-form-urlencoded",
        "application/xml",
        "multipart/form-data",
        "text/plain",
      ];

      for (const type of expectedTypes) {
        expect(DEFAULT_CONTENT_TYPE_HANDLERS[type]).toBeDefined();
        expect(
          DEFAULT_CONTENT_TYPE_HANDLERS[type].bodyProcessing,
        ).toBeDefined();
        expect(
          DEFAULT_CONTENT_TYPE_HANDLERS[type].requiresFormData,
        ).toBeDefined();
      }
    });

    it("should have correct FormData flag for multipart", () => {
      expect(
        DEFAULT_CONTENT_TYPE_HANDLERS["multipart/form-data"].requiresFormData,
      ).toBe(true);
      expect(
        DEFAULT_CONTENT_TYPE_HANDLERS["application/json"].requiresFormData,
      ).toBe(false);
    });
  });
});
