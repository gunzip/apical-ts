import type {
  OpenAPIObject,
  OperationObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  extractAuthHeaders,
  generateSecurityHeaderHandling,
  getOperationSecuritySchemes,
  hasSecurityOverride,
  type SecurityHeader,
} from "../../src/client-generator/security.js";

describe("client-generator security", () => {
  describe("extractAuthHeaders", () => {
    it("should extract API key headers from global security", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            apiKey: {
              in: "header",
              name: "X-API-Key",
              type: "apiKey",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ apiKey: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["X-API-Key"]);
    });

    it("should extract Authorization header for bearer tokens", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            bearerAuth: {
              scheme: "bearer",
              type: "http",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ bearerAuth: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["Authorization"]);
    });

    it("should extract multiple headers from different security schemes", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            apiKey: {
              in: "header",
              name: "X-API-Key",
              type: "apiKey",
            },
            bearerAuth: {
              scheme: "bearer",
              type: "http",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ apiKey: [], bearerAuth: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["X-API-Key", "Authorization"]);
    });

    it("should ignore non-header API keys", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            queryApiKey: {
              in: "query",
              name: "api_key",
              type: "apiKey",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ queryApiKey: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should ignore non-bearer HTTP schemes", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            basicAuth: {
              scheme: "basic",
              type: "http",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ basicAuth: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when no security defined", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when no security schemes defined", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ apiKey: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should ignore security schemes not used globally", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            notUsedGlobally: {
              in: "header",
              name: "X-Local-Key",
              type: "apiKey",
            },
            usedGlobally: {
              in: "header",
              name: "X-Global-Key",
              type: "apiKey",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ usedGlobally: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["X-Global-Key"]);
    });

    it("should remove duplicate headers", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            bearer1: {
              scheme: "bearer",
              type: "http",
            },
            bearer2: {
              scheme: "bearer",
              type: "http",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ bearer1: [] }, { bearer2: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["Authorization"]);
    });
  });

  describe("hasSecurityOverride", () => {
    it("should return true when operation has security override", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ apiKey: [] }],
      };

      const result = hasSecurityOverride(operation);
      expect(result).toBe(true);
    });

    it("should return true when operation has empty security override", () => {
      const operation: OperationObject = {
        responses: {},
        security: [],
      };

      const result = hasSecurityOverride(operation);
      expect(result).toBe(true);
    });

    it("should return false when operation has no security override", () => {
      const operation: OperationObject = {
        responses: {},
      };

      const result = hasSecurityOverride(operation);
      expect(result).toBe(false);
    });
  });

  describe("getOperationSecuritySchemes", () => {
    const doc: OpenAPIObject = {
      components: {
        securitySchemes: {
          apiKey: {
            in: "header",
            name: "X-API-Key",
            type: "apiKey",
          },
          bearerAuth: {
            scheme: "bearer",
            type: "http",
          },
          queryKey: {
            in: "query",
            name: "api_key",
            type: "apiKey",
          },
        },
      },
      info: { title: "Test", version: "1.0.0" },
      openapi: "3.1.0",
    };

    it("should extract API key header security schemes", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ apiKey: [] }],
      };

      const result = getOperationSecuritySchemes(operation, doc);

      expect(result).toEqual([
        {
          headerName: "X-API-Key",
          isRequired: true,
          schemeName: "apiKey",
        },
      ]);
    });

    it("should extract bearer token security schemes", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ bearerAuth: [] }],
      };

      const result = getOperationSecuritySchemes(operation, doc);

      expect(result).toEqual([
        {
          headerName: "Authorization",
          isRequired: true,
          schemeName: "bearerAuth",
        },
      ]);
    });

    it("should extract multiple security schemes", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ apiKey: [], bearerAuth: [] }],
      };

      const result = getOperationSecuritySchemes(operation, doc);

      expect(result).toEqual([
        {
          headerName: "X-API-Key",
          isRequired: true,
          schemeName: "apiKey",
        },
        {
          headerName: "Authorization",
          isRequired: true,
          schemeName: "bearerAuth",
        },
      ]);
    });

    it("should ignore non-header security schemes", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ queryKey: [] }],
      };

      const result = getOperationSecuritySchemes(operation, doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when no operation security", () => {
      const operation: OperationObject = {
        responses: {},
      };

      const result = getOperationSecuritySchemes(operation, doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when no security schemes in doc", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ apiKey: [] }],
      };

      const docWithoutSchemes: OpenAPIObject = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
      };

      const result = getOperationSecuritySchemes(operation, docWithoutSchemes);
      expect(result).toEqual([]);
    });

    it("should handle unknown security scheme references", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ unknownScheme: [] }],
      };

      const result = getOperationSecuritySchemes(operation, doc);
      expect(result).toEqual([]);
    });
  });

  describe("generateSecurityHeaderHandling", () => {
    it("should generate required header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isRequired: true,
          schemeName: "apiKey",
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-API-Key'] = XAPIKey;");
    });

    it("should generate optional header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isRequired: false,
          schemeName: "apiKey",
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe(
        "if (XAPIKey !== undefined) finalHeaders['X-API-Key'] = XAPIKey;",
      );
    });

    it("should generate multiple header assignments", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isRequired: true,
          schemeName: "apiKey",
        },
        {
          headerName: "Authorization",
          isRequired: false,
          schemeName: "bearerAuth",
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe(
        "finalHeaders['X-API-Key'] = XAPIKey;\n" +
          "    if (Authorization !== undefined) finalHeaders['Authorization'] = Authorization;",
      );
    });

    it("should handle complex header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Custom-Auth-Token",
          isRequired: true,
          schemeName: "customAuth",
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe(
        "finalHeaders['X-Custom-Auth-Token'] = XCustomAuthToken;",
      );
    });

    it("should return empty string for empty headers array", () => {
      const result = generateSecurityHeaderHandling([]);
      expect(result).toBe("");
    });

    it("should handle special characters in header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Special@Header",
          isRequired: true,
          schemeName: "special",
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-Special@Header'] = XSpecialHeader;");
    });
  });
});
