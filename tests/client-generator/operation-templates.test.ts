import { describe, expect, it } from "vitest";

import {
  buildGenericParams,
  buildParameterDeclaration,
  buildTypeAliases,
  renderOperationFunction,
  type GenericParamsConfig,
  type ParameterDeclarationConfig,
  type TypeAliasesConfig,
  type OperationFunctionRenderConfig,
} from "../../src/client-generator/templates/operation-templates.js";

describe("operation-templates", () => {
  describe("buildGenericParams", () => {
    it("should return empty generic params when no maps are generated", () => {
      const config: GenericParamsConfig = {
        shouldGenerateRequestMap: false,
        shouldGenerateResponseMap: false,
        contentTypeMaps: {
          defaultRequestContentType: null,
          defaultResponseContentType: null,
          requestContentTypeCount: 0,
          requestMapType: "{}",
          responseContentTypeCount: 0,
          responseMapType: "{}",
          typeImports: new Set(),
        },
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        initialReturnType: "ApiResponse<200, User>",
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe("");
      expect(result.updatedReturnType).toBe("ApiResponse<200, User>");
    });

    it("should generate request map generic params only", () => {
      const config: GenericParamsConfig = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: false,
        contentTypeMaps: {
          defaultRequestContentType: "application/json",
          defaultResponseContentType: null,
          requestContentTypeCount: 2,
          requestMapType:
            "{ 'application/json': User; 'application/xml': string; }",
          responseContentTypeCount: 0,
          responseMapType: "{}",
          typeImports: new Set(),
        },
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        initialReturnType: "ApiResponse<200, User>",
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TRequestContentType extends keyof TestRequestMap = "application/json">',
      );
      expect(result.updatedReturnType).toBe("ApiResponse<200, User>");
    });

    it("should generate response map generic params only", () => {
      const config: GenericParamsConfig = {
        shouldGenerateRequestMap: false,
        shouldGenerateResponseMap: true,
        contentTypeMaps: {
          defaultRequestContentType: null,
          defaultResponseContentType: "application/json",
          requestContentTypeCount: 0,
          requestMapType: "{}",
          responseContentTypeCount: 2,
          responseMapType:
            "{ 'application/json': User; 'text/plain': string; }",
          typeImports: new Set(),
        },
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        initialReturnType: "ApiResponse<200, User>",
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TResponseContentType extends keyof TestResponseMap = "application/json">',
      );
      expect(result.updatedReturnType).toBe(
        "TestResponseMap[TResponseContentType]",
      );
    });

    it("should generate both request and response map generic params", () => {
      const config: GenericParamsConfig = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: true,
        contentTypeMaps: {
          defaultRequestContentType: "application/json",
          defaultResponseContentType: "application/xml",
          requestContentTypeCount: 2,
          requestMapType:
            "{ 'application/json': User; 'application/xml': string; }",
          responseContentTypeCount: 2,
          responseMapType:
            "{ 'application/json': User; 'text/plain': string; }",
          typeImports: new Set(),
        },
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        initialReturnType: "ApiResponse<200, User>",
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TRequestContentType extends keyof TestRequestMap = "application/json", TResponseContentType extends keyof TestResponseMap = "application/xml">',
      );
      expect(result.updatedReturnType).toBe(
        "TestResponseMap[TResponseContentType]",
      );
    });

    it("should fallback to application/json when no default content type", () => {
      const config: GenericParamsConfig = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: true,
        contentTypeMaps: {
          defaultRequestContentType: null,
          defaultResponseContentType: null,
          requestContentTypeCount: 1,
          requestMapType: "{ 'text/plain': string; }",
          responseContentTypeCount: 1,
          responseMapType: "{ 'text/plain': string; }",
          typeImports: new Set(),
        },
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        initialReturnType: "ApiResponse<200, User>",
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TRequestContentType extends keyof TestRequestMap = "application/json", TResponseContentType extends keyof TestResponseMap = "application/json">',
      );
      expect(result.updatedReturnType).toBe(
        "TestResponseMap[TResponseContentType]",
      );
    });
  });

  describe("buildParameterDeclaration", () => {
    it("should build regular parameter declaration", () => {
      const config: ParameterDeclarationConfig = {
        destructuredParams: "{ path, query, body }",
        paramsInterface:
          "{ path: { id: string }; query?: { limit?: number }; body: User }",
      };

      const result = buildParameterDeclaration(config);

      expect(result).toBe(
        "{ path, query, body }: { path: { id: string }; query?: { limit?: number }; body: User }",
      );
    });

    it("should handle empty parameter declaration with default", () => {
      const config: ParameterDeclarationConfig = {
        destructuredParams: "{}",
        paramsInterface: "{}",
      };

      const result = buildParameterDeclaration(config);

      expect(result).toBe("{}: {} = {}");
    });

    it("should handle empty destructuring but non-empty interface", () => {
      const config: ParameterDeclarationConfig = {
        destructuredParams: "{}",
        paramsInterface: "{ query?: { limit?: number } }",
      };

      const result = buildParameterDeclaration(config);

      expect(result).toBe("{}: { query?: { limit?: number } }");
    });
  });

  describe("buildTypeAliases", () => {
    it("should build both request and response type aliases", () => {
      const config: TypeAliasesConfig = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: true,
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        contentTypeMaps: {
          defaultRequestContentType: "application/json",
          defaultResponseContentType: "application/json",
          requestContentTypeCount: 2,
          requestMapType:
            "{ 'application/json': User; 'application/xml': string; }",
          responseContentTypeCount: 2,
          responseMapType:
            "{ 'application/json': User; 'text/plain': string; }",
          typeImports: new Set(),
        },
      };

      const result = buildTypeAliases(config);

      expect(result).toBe(
        "export type TestRequestMap = { 'application/json': User; 'application/xml': string; };\n\n" +
          "export type TestResponseMap = { 'application/json': User; 'text/plain': string; };\n\n",
      );
    });

    it("should build only request type alias", () => {
      const config: TypeAliasesConfig = {
        shouldGenerateRequestMap: true,
        shouldGenerateResponseMap: false,
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        contentTypeMaps: {
          defaultRequestContentType: "application/json",
          defaultResponseContentType: null,
          requestContentTypeCount: 1,
          requestMapType: "{ 'application/json': User; }",
          responseContentTypeCount: 0,
          responseMapType: null,
          typeImports: new Set(),
        },
      };

      const result = buildTypeAliases(config);

      expect(result).toBe(
        "export type TestRequestMap = { 'application/json': User; };\n\n",
      );
    });

    it("should build only response type alias", () => {
      const config: TypeAliasesConfig = {
        shouldGenerateRequestMap: false,
        shouldGenerateResponseMap: true,
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        contentTypeMaps: {
          defaultRequestContentType: null,
          defaultResponseContentType: "application/json",
          requestContentTypeCount: 0,
          requestMapType: "{}",
          responseContentTypeCount: 1,
          responseMapType: "{ 'application/json': User; }",
          typeImports: new Set(),
        },
      };

      const result = buildTypeAliases(config);

      expect(result).toBe(
        "export type TestResponseMap = { 'application/json': User; };\n\n",
      );
    });

    it("should handle empty response map type", () => {
      const config: TypeAliasesConfig = {
        shouldGenerateRequestMap: false,
        shouldGenerateResponseMap: false,
        requestMapTypeName: "TestRequestMap",
        responseMapTypeName: "TestResponseMap",
        contentTypeMaps: {
          defaultRequestContentType: null,
          defaultResponseContentType: null,
          requestContentTypeCount: 0,
          requestMapType: "{}",
          responseContentTypeCount: 0,
          responseMapType: "{}",
          typeImports: new Set(),
        },
      };

      const result = buildTypeAliases(config);

      expect(result).toBe("export type TestResponseMap = {};\n\n");
    });
  });

  describe("renderOperationFunction", () => {
    it("should render complete operation function", () => {
      const config: OperationFunctionRenderConfig = {
        functionName: "testOperation",
        summary: "/** Test operation */\n",
        genericParams:
          '<TRequestContentType extends keyof TestRequestMap = "application/json">',
        parameterDeclaration:
          "{ body }: { body: TestRequestMap[TRequestContentType] }",
        updatedReturnType: "ApiResponse<200, User>",
        functionBodyCode: "return fetchApi('/test', { method: 'POST', body });",
        typeAliases:
          "export type TestRequestMap = { 'application/json': User; };\n\n",
      };

      const result = renderOperationFunction(config);

      expect(result).toBe(
        "export type TestRequestMap = { 'application/json': User; };\n\n" +
          "/** Test operation */\n" +
          'export async function testOperation<TRequestContentType extends keyof TestRequestMap = "application/json">(\n' +
          "  { body }: { body: TestRequestMap[TRequestContentType] },\n" +
          "  config: GlobalConfig = globalConfig\n" +
          "): Promise<ApiResponse<200, User>> {\n" +
          "  return fetchApi('/test', { method: 'POST', body });\n" +
          "}",
      );
    });

    it("should render function without summary", () => {
      const config: OperationFunctionRenderConfig = {
        functionName: "testOperation",
        summary: "",
        genericParams: "",
        parameterDeclaration: "{}: {} = {}",
        updatedReturnType: "ApiResponse<200, User>",
        functionBodyCode: "return fetchApi('/test');",
        typeAliases: "",
      };

      const result = renderOperationFunction(config);

      expect(result).toBe(
        "export async function testOperation(\n" +
          "  {}: {} = {},\n" +
          "  config: GlobalConfig = globalConfig\n" +
          "): Promise<ApiResponse<200, User>> {\n" +
          "  return fetchApi('/test');\n" +
          "}",
      );
    });
  });
});
