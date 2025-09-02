import { describe, expect, it } from "vitest";

import {
  determineFunctionBodyStructure,
  determineHeaderConfiguration,
  renderHeadersObject,
  renderFunctionBody,
  type HeaderConfiguration,
} from "../../src/client-generator/templates/function-body-templates.js";
import type { ContentTypeMaps } from "../../src/client-generator/responses.js";

describe("function-body-templates", () => {
  describe("determineFunctionBodyStructure", () => {
    it("should generate content type logic for request map", () => {
      const contentTypeMaps: ContentTypeMaps = {
        defaultRequestContentType: "application/json",
        defaultResponseContentType: null,
        requestContentTypeCount: 1,
        requestMapType: '{ "application/json": User; }',
        responseContentTypeCount: 0,
        responseMapType: "{}",
        typeImports: new Set(),
      };

      const result = determineFunctionBodyStructure(
        contentTypeMaps,
        true,
        ["application/json"],
        true,
        false,
      );

      expect(result.contentTypeLogic).toContain(
        'const finalRequestContentType = contentType?.request || "application/json";',
      );
      expect(result.acceptHeaderLogic).toBe("");
    });

    it("should generate content type logic for response map", () => {
      const contentTypeMaps: ContentTypeMaps = {
        defaultRequestContentType: null,
        defaultResponseContentType: "application/xml",
        requestContentTypeCount: 0,
        requestMapType: "{}",
        responseContentTypeCount: 1,
        responseMapType: '{ "application/xml": User; }',
        typeImports: new Set(),
      };

      const result = determineFunctionBodyStructure(
        contentTypeMaps,
        false,
        [],
        false,
        true,
      );

      expect(result.acceptHeaderLogic).toBe(
        '    "Accept": contentType?.response || "application/xml",',
      );
    });

    it("should generate content type logic for both request and response maps", () => {
      const contentTypeMaps: ContentTypeMaps = {
        defaultRequestContentType: "application/json",
        defaultResponseContentType: "application/xml",
        requestContentTypeCount: 1,
        requestMapType: '{ "application/json": User; }',
        responseContentTypeCount: 1,
        responseMapType: '{ "application/xml": User; }',
        typeImports: new Set(),
      };

      const result = determineFunctionBodyStructure(
        contentTypeMaps,
        true,
        ["application/json"],
        true,
        true,
      );

      expect(result.contentTypeLogic).toContain(
        'const finalRequestContentType = contentType?.request || "application/json";',
      );
      expect(result.acceptHeaderLogic).toBe(
        '    "Accept": contentType?.response || "application/xml",',
      );
    });

    it("should use application/json as default when no default is specified", () => {
      const contentTypeMaps: ContentTypeMaps = {
        defaultRequestContentType: null,
        defaultResponseContentType: null,
        requestContentTypeCount: 1,
        requestMapType: '{ "application/xml": User; }',
        responseContentTypeCount: 1,
        responseMapType: '{ "text/plain": string; }',
        typeImports: new Set(),
      };

      const result = determineFunctionBodyStructure(
        contentTypeMaps,
        true,
        ["application/xml"],
        true,
        true,
      );

      expect(result.contentTypeLogic).toContain(
        'const finalRequestContentType = contentType?.request || "application/json";',
      );
      expect(result.acceptHeaderLogic).toBe(
        '    "Accept": contentType?.response || "application/json",',
      );
    });
  });

  describe("determineHeaderConfiguration", () => {
    it("should create proper header configuration", () => {
      const result = determineHeaderConfiguration(
        true,
        true,
        ["Authorization"],
        true,
        '"Accept": application/json',
        '"Content-Type": application/json',
      );

      expect(result.shouldGenerateRequestMap).toBe(true);
      expect(result.overridesSecurity).toBe(true);
      expect(result.authHeaders).toEqual(["Authorization"]);
      expect(result.shouldGenerateResponseMap).toBe(true);
      expect(result.acceptHeaderLogic).toBe('"Accept": application/json');
      expect(result.contentTypeHeaderCode).toBe(
        '"Content-Type": application/json',
      );
    });

    it("should handle optional parameters", () => {
      const result = determineHeaderConfiguration(false, undefined, undefined);

      expect(result.shouldGenerateRequestMap).toBe(false);
      expect(result.overridesSecurity).toBeUndefined();
      expect(result.authHeaders).toBeUndefined();
      expect(result.shouldGenerateResponseMap).toBe(false);
      expect(result.acceptHeaderLogic).toBe("");
      expect(result.contentTypeHeaderCode).toBe("");
    });
  });

  describe("renderHeadersObject", () => {
    it("should render headers for request map without security override", () => {
      const config: HeaderConfiguration = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: false,
        acceptHeaderLogic: "",
        contentTypeHeaderCode: "",
      };

      const result = renderHeadersObject(config);
      expect(result).toContain("...config.headers,");
      expect(result).toContain("...contentTypeHeader,");
    });

    it("should render headers with security override", () => {
      const config: HeaderConfiguration = {
        shouldGenerateRequestMap: true,
        overridesSecurity: true,
        authHeaders: ["Authorization", "X-API-Key"],
        shouldGenerateResponseMap: false,
        acceptHeaderLogic: "",
        contentTypeHeaderCode: "",
      };

      const result = renderHeadersObject(config);
      expect(result).toContain("...Object.fromEntries(");
      expect(result).toContain("!['Authorization', 'X-API-Key'].includes(key)");
      expect(result).toContain("...contentTypeHeader,");
    });

    it("should render headers with response map", () => {
      const config: HeaderConfiguration = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: true,
        acceptHeaderLogic: '"Accept": application/json',
        contentTypeHeaderCode: "",
      };

      const result = renderHeadersObject(config);
      expect(result).toContain("...config.headers,");
      expect(result).toContain('"Accept": application/json');
      expect(result).toContain("...contentTypeHeader,");
    });

    it("should render headers without request map", () => {
      const config: HeaderConfiguration = {
        shouldGenerateRequestMap: false,
        shouldGenerateResponseMap: true,
        acceptHeaderLogic: '"Accept": application/json',
        contentTypeHeaderCode: '"Content-Type": application/json',
      };

      const result = renderHeadersObject(config);
      expect(result).toContain("...config.headers,");
      expect(result).toContain('"Accept": application/json');
      expect(result).toContain('"Content-Type": application/json');
      expect(result).not.toContain("...contentTypeHeader,");
    });
  });

  describe("renderFunctionBody", () => {
    it("should render complete function body with all components", () => {
      const result = renderFunctionBody(
        '  const finalRequestContentType = "application/json";\n',
        "  let bodyContent = JSON.stringify(body);\n",
        "    ...config.headers,",
        "/api/users/${userId}",
        "POST",
        true,
        ['    case "200": return { status: 200, data };'],
        "finalHeaders['X-Custom'] = customHeader;",
        "finalHeaders['Authorization'] = token;",
        "url.searchParams.append('filter', filter);",
      );

      expect(result).toContain(
        'const finalRequestContentType = "application/json";',
      );
      expect(result).toContain("let bodyContent = JSON.stringify(body);");
      expect(result).toContain(
        "const finalHeaders: Record<string, string> = {",
      );
      expect(result).toContain("...config.headers,");
      expect(result).toContain("finalHeaders['X-Custom'] = customHeader;");
      expect(result).toContain("finalHeaders['Authorization'] = token;");
      expect(result).toContain(
        "const url = new URL(`/api/users/${userId}`, config.baseURL);",
      );
      expect(result).toContain("url.searchParams.append('filter', filter);");
      expect(result).toContain('method: "POST",');
      expect(result).toContain("body: bodyContent,");
      expect(result).toContain("switch (response.status) {");
      expect(result).toContain('case "200": return { status: 200, data };');
      expect(result).toContain("default: {");
      expect(result).toContain('kind: "unexpected-response"');
    });

    it("should render function body without body for GET request", () => {
      const result = renderFunctionBody(
        "",
        "",
        "    ...config.headers,",
        "/api/users",
        "GET",
        false,
        ['    case "200": return { status: 200, data };'],
      );

      expect(result).toContain('method: "GET",');
      expect(result).not.toContain("body: bodyContent,");
      expect(result).toContain("headers: finalHeaders,");
    });

    it("should handle optional parameters", () => {
      const result = renderFunctionBody(
        "",
        "",
        "    ...config.headers,",
        "/api/users",
        "GET",
        false,
        ['    case "200": return { status: 200, data };'],
      );

      expect(result).not.toContain("finalHeaders['");
      expect(result).not.toContain("url.searchParams.append");
    });
  });
});
