import type { ParameterObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  renderDestructuredParameters,
  renderParameterHandling,
  renderParameterInterface,
} from "../../src/client-generator/templates/parameter-templates.js";
import type { ParameterAnalysis } from "../../src/client-generator/models/parameter-models.js";

describe("parameter template functions", () => {
  const createBasicAnalysis = (overrides: Partial<ParameterAnalysis> = {}): ParameterAnalysis => ({
    structure: {
      processed: {
        pathParams: [],
        queryParams: [],
        headerParams: [],
        securityHeaders: [],
        isQueryOptional: true,
        isHeadersOptional: true,
      },
      hasBody: false,
      hasRequestMap: false,
      hasResponseMap: false,
    },
    optionalityRules: {
      isQueryOptional: true,
      isHeadersOptional: true,
      isBodyOptional: true,
    },
    pathProperties: [],
    queryProperties: [],
    headerProperties: [],
    securityHeaderProperties: [],
    ...overrides,
  });

  describe("renderParameterInterface", () => {
    it("should render empty interface for no parameters", () => {
      const analysis = createBasicAnalysis();
      const result = renderParameterInterface(analysis);
      expect(result).toBe("{}");
    });

    it("should render path parameters correctly", () => {
      const analysis = createBasicAnalysis({
        pathProperties: ["userId", "projectId"],
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            pathParams: [
              { in: "path", name: "user-id", required: true, schema: { type: "string" } },
              { in: "path", name: "project-id", required: true, schema: { type: "string" } },
            ] as ParameterObject[],
          },
        },
      });
      
      const result = renderParameterInterface(analysis);
      expect(result).toContain("path: {");
      expect(result).toContain("userId: string");
      expect(result).toContain("projectId: string");
    });

    it("should render query parameters with optionality", () => {
      const analysis = createBasicAnalysis({
        queryProperties: [
          { name: "filter", isRequired: true },
          { name: "sort", isRequired: false },
        ],
        optionalityRules: {
          ...createBasicAnalysis().optionalityRules,
          isQueryOptional: false,
        },
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            queryParams: [
              { in: "query", name: "filter", required: true, schema: { type: "string" } },
              { in: "query", name: "sort", required: false, schema: { type: "string" } },
            ] as ParameterObject[],
            isQueryOptional: false,
          },
        },
      });
      
      const result = renderParameterInterface(analysis);
      expect(result).toContain("query: {");
      expect(result).toContain("filter: string");
      expect(result).toContain("sort?: string");
    });

    it("should render header parameters with quoting", () => {
      const analysis = createBasicAnalysis({
        headerProperties: [
          { name: "Content-Type", isRequired: true, varName: "contentType", needsQuoting: true },
          { name: "simpleheader", isRequired: false, varName: "simpleheader", needsQuoting: false },
        ],
        optionalityRules: {
          ...createBasicAnalysis().optionalityRules,
          isHeadersOptional: false,
        },
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            headerParams: [
              { in: "header", name: "Content-Type", required: true, schema: { type: "string" } },
              { in: "header", name: "simpleheader", required: false, schema: { type: "string" } },
            ] as ParameterObject[],
            isHeadersOptional: false,
          },
        },
      });
      
      const result = renderParameterInterface(analysis);
      expect(result).toContain("headers: {");
      expect(result).toContain('"Content-Type": string');
      expect(result).toContain("simpleheader?: string");
    });

    it("should render security headers", () => {
      const analysis = createBasicAnalysis({
        securityHeaderProperties: [
          { headerName: "Authorization", isRequired: true, varName: "authorization" },
        ],
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            securityHeaders: [
              { headerName: "Authorization", isRequired: true, schemeName: "bearerAuth" },
            ],
          },
        },
      });
      
      const result = renderParameterInterface(analysis);
      expect(result).toContain('"Authorization": string');
    });

    it("should render body parameter", () => {
      const analysis = createBasicAnalysis({
        structure: {
          ...createBasicAnalysis().structure,
          hasBody: true,
          bodyTypeInfo: { typeName: "UserCreateRequest", isRequired: true },
        },
        optionalityRules: {
          ...createBasicAnalysis().optionalityRules,
          isBodyOptional: false,
        },
      });
      
      const result = renderParameterInterface(analysis);
      expect(result).toContain("body: UserCreateRequest");
    });

    it("should render contentType parameter for request/response maps", () => {
      const analysis = createBasicAnalysis({
        structure: {
          ...createBasicAnalysis().structure,
          hasRequestMap: true,
          hasResponseMap: true,
          requestMapTypeName: "RequestMap",
          responseMapTypeName: "ResponseMap",
        },
      });
      
      const result = renderParameterInterface(analysis);
      expect(result).toContain("contentType?: { request?: TRequestContentType; response?: TResponseContentType }");
    });
  });

  describe("renderDestructuredParameters", () => {
    it("should render empty destructuring for no parameters", () => {
      const analysis = createBasicAnalysis();
      const result = renderDestructuredParameters(analysis);
      expect(result).toBe("{}");
    });

    it("should render destructured path parameters", () => {
      const analysis = createBasicAnalysis({
        pathProperties: ["userId", "projectId"],
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            pathParams: [
              { in: "path", name: "user-id", required: true, schema: { type: "string" } },
            ] as ParameterObject[],
          },
        },
      });
      
      const result = renderDestructuredParameters(analysis);
      expect(result).toContain("path: { userId, projectId }");
    });

    it("should render destructured query parameters with defaults", () => {
      const analysis = createBasicAnalysis({
        queryProperties: [{ name: "filter", isRequired: false }],
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            queryParams: [
              { in: "query", name: "filter", required: false, schema: { type: "string" } },
            ] as ParameterObject[],
          },
        },
      });
      
      const result = renderDestructuredParameters(analysis);
      expect(result).toContain("query: { filter } = {}");
    });

    it("should render destructured header parameters with quoting", () => {
      const analysis = createBasicAnalysis({
        headerProperties: [
          { name: "Content-Type", isRequired: true, varName: "ContentType", needsQuoting: true },
        ],
        structure: {
          ...createBasicAnalysis().structure,
          processed: {
            ...createBasicAnalysis().structure.processed,
            headerParams: [
              { in: "header", name: "Content-Type", required: true, schema: { type: "string" } },
            ] as ParameterObject[],
          },
        },
      });
      
      const result = renderDestructuredParameters(analysis);
      expect(result).toContain('"Content-Type": ContentType');
    });

    it("should render body parameter with default", () => {
      const analysis = createBasicAnalysis({
        structure: {
          ...createBasicAnalysis().structure,
          hasBody: true,
          bodyTypeInfo: { typeName: "UserCreateRequest", isRequired: false },
        },
      });
      
      const result = renderDestructuredParameters(analysis);
      expect(result).toContain("body = undefined");
    });
  });

  describe("renderParameterHandling", () => {
    it("should render header parameter handling code", () => {
      const params: ParameterObject[] = [
        { in: "header", name: "X-API-Key", required: true, schema: { type: "string" } },
        { in: "header", name: "Content-Type", required: false, schema: { type: "string" } },
      ];
      
      const result = renderParameterHandling("header", params);
      expect(result).toContain("if (XAPIKey !== undefined) finalHeaders['X-API-Key'] = String(XAPIKey);");
      expect(result).toContain("if (ContentType !== undefined) finalHeaders['Content-Type'] = String(ContentType);");
    });

    it("should render query parameter handling code", () => {
      const params: ParameterObject[] = [
        { in: "query", name: "filter", required: true, schema: { type: "string" } },
        { in: "query", name: "sort-by", required: false, schema: { type: "string" } },
      ];
      
      const result = renderParameterHandling("query", params);
      expect(result).toContain("if (filter !== undefined) url.searchParams.append('filter', String(filter));");
      expect(result).toContain("if (sortBy !== undefined) url.searchParams.append('sort-by', String(sortBy));");
    });

    it("should return empty string for no parameters", () => {
      const result = renderParameterHandling("header", []);
      expect(result).toBe("");
    });
  });
});