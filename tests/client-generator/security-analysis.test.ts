import type {
  OpenAPIObject,
  OperationObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  analyzeGlobalSecuritySchemes,
  analyzeSecurityScheme,
  determineAuthHeaderRequirements,
  processOperationSecurity,
} from "../../src/client-generator/security.js";

describe("client-generator security analysis", () => {
  describe("analyzeSecurityScheme", () => {
    it("should analyze API key header scheme", () => {
      const scheme: SecuritySchemeObject = {
        in: "header",
        name: "X-API-Key",
        type: "apiKey",
      };

      const result = analyzeSecurityScheme("apiKey", scheme);

      expect(result).toEqual({
        schemeName: "apiKey",
        scheme,
        headerName: "X-API-Key",
        isHeaderBased: true,
      });
    });

    it("should analyze bearer token scheme", () => {
      const scheme: SecuritySchemeObject = {
        scheme: "bearer",
        type: "http",
      };

      const result = analyzeSecurityScheme("bearerAuth", scheme);

      expect(result).toEqual({
        schemeName: "bearerAuth",
        scheme,
        headerName: "Authorization",
        isHeaderBased: true,
      });
    });

    it("should analyze non-header scheme", () => {
      const scheme: SecuritySchemeObject = {
        in: "query",
        name: "api_key",
        type: "apiKey",
      };

      const result = analyzeSecurityScheme("queryKey", scheme);

      expect(result).toEqual({
        schemeName: "queryKey",
        scheme,
        headerName: null,
        isHeaderBased: false,
      });
    });

    it("should analyze basic auth scheme as non-header", () => {
      const scheme: SecuritySchemeObject = {
        scheme: "basic",
        type: "http",
      };

      const result = analyzeSecurityScheme("basicAuth", scheme);

      expect(result).toEqual({
        schemeName: "basicAuth",
        scheme,
        headerName: null,
        isHeaderBased: false,
      });
    });
  });

  describe("analyzeGlobalSecuritySchemes", () => {
    it("should analyze global security schemes", () => {
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
            notUsedGlobally: {
              in: "header",
              name: "X-Local-Key",
              type: "apiKey",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ apiKey: [], bearerAuth: [] }],
      };

      const result = analyzeGlobalSecuritySchemes(doc);

      expect(result.globalSchemeNames).toEqual(new Set(["apiKey", "bearerAuth"]));
      expect(result.authHeaders).toEqual(["X-API-Key", "Authorization"]);
      expect(result.analyzedSchemes).toHaveLength(2);
      expect(result.analyzedSchemes[0].schemeName).toBe("apiKey");
      expect(result.analyzedSchemes[1].schemeName).toBe("bearerAuth");
    });

    it("should handle document with no security", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
      };

      const result = analyzeGlobalSecuritySchemes(doc);

      expect(result.globalSchemeNames).toEqual(new Set());
      expect(result.authHeaders).toEqual([]);
      expect(result.analyzedSchemes).toEqual([]);
    });

    it("should handle duplicate headers", () => {
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

      const result = analyzeGlobalSecuritySchemes(doc);

      expect(result.authHeaders).toEqual(["Authorization"]);
    });
  });

  describe("processOperationSecurity", () => {
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

    it("should process operation with header-based security", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ apiKey: [], bearerAuth: [] }],
      };

      const result = processOperationSecurity(operation, doc);

      expect(result.hasOverride).toBe(true);
      expect(result.operationHeaders).toEqual([
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
      expect(result.analyzedSchemes).toHaveLength(2);
    });

    it("should process operation with no security override", () => {
      const operation: OperationObject = {
        responses: {},
      };

      const result = processOperationSecurity(operation, doc);

      expect(result.hasOverride).toBe(false);
      expect(result.operationHeaders).toEqual([]);
      expect(result.analyzedSchemes).toEqual([]);
    });

    it("should ignore non-header security schemes", () => {
      const operation: OperationObject = {
        responses: {},
        security: [{ queryKey: [] }],
      };

      const result = processOperationSecurity(operation, doc);

      expect(result.hasOverride).toBe(true);
      expect(result.operationHeaders).toEqual([]);
      expect(result.analyzedSchemes).toHaveLength(1);
      expect(result.analyzedSchemes[0].isHeaderBased).toBe(false);
    });
  });

  describe("determineAuthHeaderRequirements", () => {
    it("should determine requirements for operation with global and operation security", () => {
      const doc: OpenAPIObject = {
        components: {
          securitySchemes: {
            globalKey: {
              in: "header",
              name: "X-Global-Key",
              type: "apiKey",
            },
            operationKey: {
              in: "header",
              name: "X-Operation-Key",
              type: "apiKey",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
        security: [{ globalKey: [] }],
      };

      const operation: OperationObject = {
        responses: {},
        security: [{ operationKey: [] }],
      };

      const result = determineAuthHeaderRequirements(operation, doc);

      expect(result.globalHeaders).toEqual(["X-Global-Key"]);
      expect(result.operationHeaders).toEqual([
        {
          headerName: "X-Operation-Key",
          isRequired: true,
          schemeName: "operationKey",
        },
      ]);
      expect(result.requiresAuthentication).toBe(true);
    });

    it("should determine requirements for operation with no authentication", () => {
      const doc: OpenAPIObject = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
      };

      const operation: OperationObject = {
        responses: {},
      };

      const result = determineAuthHeaderRequirements(operation, doc);

      expect(result.globalHeaders).toEqual([]);
      expect(result.operationHeaders).toEqual([]);
      expect(result.requiresAuthentication).toBe(false);
    });
  });
});