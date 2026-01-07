import { describe, expect, it } from "vitest";

import {
  buildGenericParams,
  buildParameterDeclaration,
  renderOperationFunction,
  type GenericParamsConfig,
  type ParameterDeclarationConfig,
  type OperationFunctionRenderConfig,
} from "../src/templates/operation-templates.js";

describe("operation-templates", () => {
  describe("buildGenericParams", () => {
    it("should always include TForceValidation generic parameter", () => {
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
        initialReturnType: 'ApiResponse<"200", User>',
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        "<TForceValidation extends boolean = true>",
      );
      expect(result.updatedReturnType).toBe('ApiResponse<"200", User>');
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
        initialReturnType: 'ApiResponse<"200", User>',
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json">',
      );
      expect(result.updatedReturnType).toBe('ApiResponse<"200", User>');
    });

    it("should generate response map generic params only (return type stays ApiResponse)", () => {
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
        initialReturnType: 'ApiResponse<"200", User>',
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TForceValidation extends boolean = true, TResponseContentType extends { [K in keyof TestResponseMap]: keyof TestResponseMap[K]; }[keyof TestResponseMap] = "application/json">',
      );
      expect(result.updatedReturnType).toBe('ApiResponse<"200", User>');
    });

    it("should generate both request and response map generic params (return type stays ApiResponse)", () => {
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
        initialReturnType: 'ApiResponse<"200", User>',
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json", TResponseContentType extends { [K in keyof TestResponseMap]: keyof TestResponseMap[K]; }[keyof TestResponseMap] = "application/xml">',
      );
      expect(result.updatedReturnType).toBe('ApiResponse<"200", User>');
    });

    it("should fallback to application/json when no default content type (return type stays ApiResponse)", () => {
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
        initialReturnType: 'ApiResponse<"200", User>',
      };

      const result = buildGenericParams(config);

      expect(result.genericParams).toBe(
        '<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json", TResponseContentType extends { [K in keyof TestResponseMap]: keyof TestResponseMap[K]; }[keyof TestResponseMap] = "application/json">',
      );
      expect(result.updatedReturnType).toBe('ApiResponse<"200", User>');
    });
  });

  describe("buildParameterDeclaration", () => {
    it("should build regular parameter declaration", () => {
      const config: ParameterDeclarationConfig = {
        destructuredParams: "{ path, query, body }",
        paramsInterface:
          "{ path: { id: string }; query?: { limit?: number }; body: User }",
        shouldDefaultParams: false,
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
        shouldDefaultParams: false,
      };

      const result = buildParameterDeclaration(config);

      expect(result).toBe("{}: {} = {}");
    });

    it("should handle empty destructuring but non-empty interface", () => {
      const config: ParameterDeclarationConfig = {
        destructuredParams: "{}",
        paramsInterface: "{ query?: { limit?: number } }",
        shouldDefaultParams: false,
      };

      const result = buildParameterDeclaration(config);

      expect(result).toBe("{}: { query?: { limit?: number } }");
    });

    it("should add default assignment when params can be omitted", () => {
      const config: ParameterDeclarationConfig = {
        destructuredParams: "params",
        paramsInterface: "{ query?: { limit?: number } }",
        shouldDefaultParams: true,
      };

      const result = buildParameterDeclaration(config);

      expect(result).toBe("params: { query?: { limit?: number } } = {}");
    });
  });

  describe("renderOperationFunction", () => {
    it("should render complete operation function", () => {
      const config: OperationFunctionRenderConfig = {
        functionName: "testOperation",
        summary: "/** Test operation */\n",
        genericParams:
          '<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json">',
        parameterDeclaration:
          "{ body }: { body: TestRequestMap[TRequestContentType] }",
        parameterInterface: "{ body: TestRequestMap[TRequestContentType] }",
        canOmitParams: false,
        updatedReturnType: 'ApiResponse<"200", User>',
        functionBodyCode: "return fetchApi('/test', { method: 'POST', body });",
        typeAliases:
          "export type TestRequestMap = { 'application/json': User; };\n\n",
      };

      const result = renderOperationFunction(config);

      expect(result).toBe(
        "export type TestRequestMap = { 'application/json': User; };\n\n" +
          "/** Test operation */\n" +
          'export function testOperation<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json">(\n' +
          "  params: { body: TestRequestMap[TRequestContentType] },\n" +
          "  config: GlobalConfig & { forceValidation: true }\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          'export function testOperation<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json">(\n' +
          "  params: { body: TestRequestMap[TRequestContentType] },\n" +
          "  config: GlobalConfig & { forceValidation: false }\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          'export function testOperation<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json">(\n' +
          "  params: { body: TestRequestMap[TRequestContentType] },\n" +
          "  config?: GlobalConfig\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          'export async function testOperation<TForceValidation extends boolean = true, TRequestContentType extends keyof TestRequestMap = "application/json">(\n' +
          "  { body }: { body: TestRequestMap[TRequestContentType] },\n" +
          "  config: GlobalConfig = globalConfig\n" +
          '): Promise<ApiResponse<"200", User>> {\n' +
          "  return fetchApi('/test', { method: 'POST', body });\n" +
          "}",
      );
    });

    it("should render function without summary", () => {
      const config: OperationFunctionRenderConfig = {
        functionName: "testOperation",
        summary: "",
        genericParams: "<TForceValidation extends boolean = true>",
        parameterDeclaration: "{}: {} = {}",
        parameterInterface: "{}",
        canOmitParams: false,
        updatedReturnType: 'ApiResponse<"200", User>',
        functionBodyCode: "return fetchApi('/test');",
        typeAliases: "",
      };

      const result = renderOperationFunction(config);

      expect(result).toBe(
        "export function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: {},\n" +
          "  config: GlobalConfig & { forceValidation: true }\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          "export function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: {},\n" +
          "  config: GlobalConfig & { forceValidation: false }\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          "export function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: {},\n" +
          "  config?: GlobalConfig\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          "export async function testOperation<TForceValidation extends boolean = true>(\n" +
          "  {}: {} = {},\n" +
          "  config: GlobalConfig = globalConfig\n" +
          '): Promise<ApiResponse<"200", User>> {\n' +
          "  return fetchApi('/test');\n" +
          "}",
      );
    });

    it("should emit overload without params when they can be omitted", () => {
      const config: OperationFunctionRenderConfig = {
        functionName: "testOperation",
        summary: "",
        genericParams: "<TForceValidation extends boolean = true>",
        parameterDeclaration: "params: { query?: { limit?: number } } = {}",
        parameterInterface: "{ query?: { limit?: number } }",
        canOmitParams: true,
        updatedReturnType: 'ApiResponse<"200", User>',
        functionBodyCode: "return fetchApi('/test');",
        typeAliases: "",
      };

      const result = renderOperationFunction(config);

      expect(result).toBe(
        "export function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: { query?: { limit?: number } },\n" +
          "  config: GlobalConfig & { forceValidation: true }\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          "export function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: { query?: { limit?: number } },\n" +
          "  config: GlobalConfig & { forceValidation: false }\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          "export function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: { query?: { limit?: number } },\n" +
          "  config?: GlobalConfig\n" +
          '): Promise<ApiResponse<"200", User>>;\n' +
          'export function testOperation<TForceValidation extends boolean = true>(): Promise<ApiResponse<"200", User>>;\n' +
          "export async function testOperation<TForceValidation extends boolean = true>(\n" +
          "  params: { query?: { limit?: number } } = {},\n" +
          "  config: GlobalConfig = globalConfig\n" +
          '): Promise<ApiResponse<"200", User>> {\n' +
          "  return fetchApi('/test');\n" +
          "}",
      );
    });
  });
});
