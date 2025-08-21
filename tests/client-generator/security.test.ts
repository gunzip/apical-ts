import { describe, it, expect } from "vitest";
import {
  extractAuthHeaders,
  hasSecurityOverride,
  getOperationSecuritySchemes,
  generateSecurityHeaderHandling,
  type SecurityHeader,
} from "../../src/client-generator/security.js";
import type {
  OpenAPIObject,
  OperationObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";

describe("client-generator security", () => {
  describe("extractAuthHeaders", () => {
    it("should extract API key headers from global security", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ apiKey: [] }],
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
            },
          },
        },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["X-API-Key"]);
    });

    it("should extract Authorization header for bearer tokens", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["Authorization"]);
    });

    it("should extract multiple headers from different security schemes", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ apiKey: [], bearerAuth: [] }],
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
            },
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["X-API-Key", "Authorization"]);
    });

    it("should ignore non-header API keys", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ queryApiKey: [] }],
        components: {
          securitySchemes: {
            queryApiKey: {
              type: "apiKey",
              in: "query",
              name: "api_key",
            },
          },
        },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should ignore non-bearer HTTP schemes", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ basicAuth: [] }],
        components: {
          securitySchemes: {
            basicAuth: {
              type: "http",
              scheme: "basic",
            },
          },
        },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when no security defined", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should return empty array when no security schemes defined", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ apiKey: [] }],
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual([]);
    });

    it("should ignore security schemes not used globally", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ usedGlobally: [] }],
        components: {
          securitySchemes: {
            usedGlobally: {
              type: "apiKey",
              in: "header",
              name: "X-Global-Key",
            },
            notUsedGlobally: {
              type: "apiKey",
              in: "header",
              name: "X-Local-Key",
            },
          },
        },
      };

      const result = extractAuthHeaders(doc);
      expect(result).toEqual(["X-Global-Key"]);
    });

    it("should remove duplicate headers", () => {
      const doc: OpenAPIObject = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        security: [{ bearer1: [] }, { bearer2: [] }],
        components: {
          securitySchemes: {
            bearer1: {
              type: "http",
              scheme: "bearer",
            },
            bearer2: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
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
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
          queryKey: {
            type: "apiKey",
            in: "query",
            name: "api_key",
          },
        },
      },
    };

    it("should extract API key header security schemes", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ apiKey: [] }],
      };

      const result = getOperationSecuritySchemes(operation, doc);
      
      expect(result).toEqual([
        {
          schemeName: "apiKey",
          headerName: "X-API-Key",
          isRequired: true,
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
          schemeName: "bearerAuth",
          headerName: "Authorization",
          isRequired: true,
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
          schemeName: "apiKey",
          headerName: "X-API-Key",
          isRequired: true,
        },
        {
          schemeName: "bearerAuth",
          headerName: "Authorization",
          isRequired: true,
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
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
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
          schemeName: "apiKey",
          headerName: "X-API-Key",
          isRequired: true,
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-API-Key'] = XAPIKey;");
    });

    it("should generate optional header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          schemeName: "apiKey",
          headerName: "X-API-Key",
          isRequired: false,
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe("if (XAPIKey !== undefined) finalHeaders['X-API-Key'] = XAPIKey;");
    });

    it("should generate multiple header assignments", () => {
      const headers: SecurityHeader[] = [
        {
          schemeName: "apiKey",
          headerName: "X-API-Key",
          isRequired: true,
        },
        {
          schemeName: "bearerAuth",
          headerName: "Authorization",
          isRequired: false,
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe(
        "finalHeaders['X-API-Key'] = XAPIKey;\n" +
        "    if (Authorization !== undefined) finalHeaders['Authorization'] = Authorization;"
      );
    });

    it("should handle complex header names", () => {
      const headers: SecurityHeader[] = [
        {
          schemeName: "customAuth",
          headerName: "X-Custom-Auth-Token",
          isRequired: true,
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-Custom-Auth-Token'] = XCustomAuthToken;");
    });

    it("should return empty string for empty headers array", () => {
      const result = generateSecurityHeaderHandling([]);
      expect(result).toBe("");
    });

    it("should handle special characters in header names", () => {
      const headers: SecurityHeader[] = [
        {
          schemeName: "special",
          headerName: "X-Special@Header",
          isRequired: true,
        },
      ];

      const result = generateSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-Special@Header'] = XSpecialHeader;");
    });
  });
});