import { describe, expect, it } from "vitest";

import type { ConfigStructure } from "../../src/client-generator/models/config-models.js";
import {
  renderApiResponseTypes,
  renderAuthHeadersType,
  renderConfigImplementation,
  renderConfigInterface,
  renderConfigSupport,
  renderErrorClasses,
  renderOperationUtilities,
  renderTypeGuards,
  renderUtilityFunctions,
} from "../../src/client-generator/templates/config-templates.js";

describe("client-generator config-templates", () => {
  describe("renderConfigInterface", () => {
    it("should render interface with auth headers", () => {
      const config: ConfigStructure = {
        auth: {
          authHeaders: ["authorization"],
          authHeadersType: "'authorization'",
          hasAuthHeaders: true,
        },
        server: {
          serverUrls: ["https://api.example.com"],
          baseURLType: "'https://api.example.com' | (string & {})",
          defaultBaseURL: "https://api.example.com",
          hasServerUrls: true,
        },
      };

      const result = renderConfigInterface(config);

      expect(result).toContain("export interface GlobalConfig");
      expect(result).toContain("baseURL: 'https://api.example.com' | (string & {});");
      expect(result).toContain("[K in AuthHeaders]?: string;");
    });

    it("should render interface without auth headers", () => {
      const config: ConfigStructure = {
        auth: {
          authHeaders: [],
          authHeadersType: "string",
          hasAuthHeaders: false,
        },
        server: {
          serverUrls: [],
          baseURLType: "string",
          defaultBaseURL: "",
          hasServerUrls: false,
        },
      };

      const result = renderConfigInterface(config);

      expect(result).toContain("export interface GlobalConfig");
      expect(result).toContain("baseURL: string;");
      expect(result).toContain("[K in string]?: string;");
    });
  });

  describe("renderAuthHeadersType", () => {
    it("should render auth headers type when present", () => {
      const config: ConfigStructure = {
        auth: {
          authHeaders: ["authorization", "x-api-key"],
          authHeadersType: "'authorization' | 'x-api-key'",
          hasAuthHeaders: true,
        },
        server: {
          serverUrls: [],
          baseURLType: "string",
          defaultBaseURL: "",
          hasServerUrls: false,
        },
      };

      const result = renderAuthHeadersType(config);

      expect(result).toBe("export type AuthHeaders = 'authorization' | 'x-api-key';");
    });

    it("should render empty string when no auth headers", () => {
      const config: ConfigStructure = {
        auth: {
          authHeaders: [],
          authHeadersType: "string",
          hasAuthHeaders: false,
        },
        server: {
          serverUrls: [],
          baseURLType: "string",
          defaultBaseURL: "",
          hasServerUrls: false,
        },
      };

      const result = renderAuthHeadersType(config);

      expect(result).toBe("");
    });
  });

  describe("renderConfigImplementation", () => {
    it("should render config implementation with server URL", () => {
      const config: ConfigStructure = {
        auth: {
          authHeaders: [],
          authHeadersType: "string",
          hasAuthHeaders: false,
        },
        server: {
          serverUrls: ["https://api.example.com"],
          baseURLType: "'https://api.example.com' | (string & {})",
          defaultBaseURL: "https://api.example.com",
          hasServerUrls: true,
        },
      };

      const result = renderConfigImplementation(config);

      expect(result).toContain("export const globalConfig: GlobalConfig");
      expect(result).toContain("baseURL: 'https://api.example.com',");
      expect(result).toContain("fetch: fetch,");
      expect(result).toContain("headers: {}");
    });

    it("should render config implementation with empty base URL", () => {
      const config: ConfigStructure = {
        auth: {
          authHeaders: [],
          authHeadersType: "string",
          hasAuthHeaders: false,
        },
        server: {
          serverUrls: [],
          baseURLType: "string",
          defaultBaseURL: "",
          hasServerUrls: false,
        },
      };

      const result = renderConfigImplementation(config);

      expect(result).toContain("baseURL: '',");
    });
  });

  describe("renderApiResponseTypes", () => {
    it("should render API response types", () => {
      const result = renderApiResponseTypes();

      expect(result).toContain("export type ApiResponse<S extends number, T>");
      expect(result).toContain("readonly status: S;");
      expect(result).toContain("readonly data: T;");
      expect(result).toContain("readonly error: import(\"zod\").ZodError;");
    });
  });

  describe("renderTypeGuards", () => {
    it("should render type guard functions", () => {
      const result = renderTypeGuards();

      expect(result).toContain("export function isSuccessResponse");
      expect(result).toContain("export function isErrorResponse");
      expect(result).toContain("result.status >= 200 && result.status < 300");
    });
  });

  describe("renderErrorClasses", () => {
    it("should render error classes", () => {
      const result = renderErrorClasses();

      expect(result).toContain("export class UnexpectedResponseError extends Error");
      expect(result).toContain("export class ApiError extends Error");
      expect(result).toContain("status: number;");
      expect(result).toContain("data: unknown;");
    });
  });

  describe("renderUtilityFunctions", () => {
    it("should render utility functions", () => {
      const result = renderUtilityFunctions();

      expect(result).toContain("export function isStatus");
      expect(result).toContain("export function handleResponse");
      expect(result).toContain("export async function parseResponseBody");
      expect(result).toContain("application/json");
    });
  });

  describe("renderOperationUtilities", () => {
    it("should render operation utilities", () => {
      const result = renderOperationUtilities();

      expect(result).toContain("type Operation =");
      expect(result).toContain("export function configureOperations");
      expect(result).toContain("typeof operations[key] === 'function'");
    });
  });

  describe("renderConfigSupport", () => {
    it("should render complete config support", () => {
      const result = renderConfigSupport();

      expect(result).toContain("export type ApiResponse");
      expect(result).toContain("export function isSuccessResponse");
      expect(result).toContain("export class UnexpectedResponseError");
      expect(result).toContain("export function isStatus");
      expect(result).toContain("export function configureOperations");
    });

    it("should include all component functions", () => {
      const result = renderConfigSupport();

      /* Verify that all individual template functions are included */
      expect(result).toContain(renderApiResponseTypes());
      expect(result).toContain(renderTypeGuards());
      expect(result).toContain(renderErrorClasses());
      expect(result).toContain(renderUtilityFunctions());
      expect(result).toContain(renderOperationUtilities());
    });
  });
});