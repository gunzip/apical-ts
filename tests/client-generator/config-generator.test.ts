import { describe, expect, it } from "vitest";

import {
  analyzeAuthConfiguration,
  analyzeServerConfiguration,
  determineConfigStructure,
  generateConfigTypes,
} from "../../src/client-generator/config-generator.js";

describe("client-generator config-generator", () => {
  describe("analyzeAuthConfiguration", () => {
    it("should analyze auth headers when present", () => {
      const authHeaders = ["authorization", "x-api-key"];

      const result = analyzeAuthConfiguration(authHeaders);

      expect(result).toEqual({
        authHeaders: ["authorization", "x-api-key"],
        authHeadersType: "'authorization' | 'x-api-key'",
        hasAuthHeaders: true,
      });
    });

    it("should handle empty auth headers", () => {
      const authHeaders: string[] = [];

      const result = analyzeAuthConfiguration(authHeaders);

      expect(result).toEqual({
        authHeaders: [],
        authHeadersType: "string",
        hasAuthHeaders: false,
      });
    });

    it("should handle single auth header", () => {
      const authHeaders = ["authorization"];

      const result = analyzeAuthConfiguration(authHeaders);

      expect(result).toEqual({
        authHeaders: ["authorization"],
        authHeadersType: "'authorization'",
        hasAuthHeaders: true,
      });
    });
  });

  describe("analyzeServerConfiguration", () => {
    it("should analyze server URLs when present", () => {
      const serverUrls = [
        "https://api.example.com",
        "https://api-test.example.com",
      ];

      const result = analyzeServerConfiguration(serverUrls);

      expect(result).toEqual({
        serverUrls: ["https://api.example.com", "https://api-test.example.com"],
        baseURLType:
          "'https://api.example.com' | 'https://api-test.example.com' | (string & {})",
        defaultBaseURL: "https://api.example.com",
        hasServerUrls: true,
      });
    });

    it("should handle empty server URLs", () => {
      const serverUrls: string[] = [];

      const result = analyzeServerConfiguration(serverUrls);

      expect(result).toEqual({
        serverUrls: [],
        baseURLType: "string",
        defaultBaseURL: "",
        hasServerUrls: false,
      });
    });

    it("should handle undefined server URLs", () => {
      const result = analyzeServerConfiguration();

      expect(result).toEqual({
        serverUrls: [],
        baseURLType: "string",
        defaultBaseURL: "",
        hasServerUrls: false,
      });
    });

    it("should handle single server URL", () => {
      const serverUrls = ["https://api.example.com"];

      const result = analyzeServerConfiguration(serverUrls);

      expect(result).toEqual({
        serverUrls: ["https://api.example.com"],
        baseURLType: "'https://api.example.com' | (string & {})",
        defaultBaseURL: "https://api.example.com",
        hasServerUrls: true,
      });
    });
  });

  describe("determineConfigStructure", () => {
    it("should combine auth and server configuration", () => {
      const authHeaders = ["authorization"];
      const serverUrls = ["https://api.example.com"];

      const result = determineConfigStructure(authHeaders, serverUrls);

      expect(result.auth).toEqual({
        authHeaders: ["authorization"],
        authHeadersType: "'authorization'",
        hasAuthHeaders: true,
      });
      expect(result.server).toEqual({
        serverUrls: ["https://api.example.com"],
        baseURLType: "'https://api.example.com' | (string & {})",
        defaultBaseURL: "https://api.example.com",
        hasServerUrls: true,
      });
    });

    it("should handle empty inputs", () => {
      const authHeaders: string[] = [];
      const serverUrls: string[] = [];

      const result = determineConfigStructure(authHeaders, serverUrls);

      expect(result.auth.hasAuthHeaders).toBe(false);
      expect(result.server.hasServerUrls).toBe(false);
    });
  });

  describe("generateConfigTypes", () => {
    it("should generate union type for baseURL with server URLs", () => {
      const authHeaders = ["custom-token"];
      const serverUrls = [
        "https://localhost/api/v1",
        "https://localhost/api/v2",
        "https://prod.example.com/api",
      ];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain(
        "baseURL: 'https://localhost/api/v1' | 'https://localhost/api/v2' | 'https://prod.example.com/api' | (string & {});",
      );
    });

    it("should fallback to string type when no server URLs", () => {
      const authHeaders = ["custom-token"];
      const serverUrls: string[] = [];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain("baseURL: string;");
    });

    it("should handle single server URL", () => {
      const authHeaders: string[] = [];
      const serverUrls = ["https://api.example.com"];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain(
        "baseURL: 'https://api.example.com' | (string & {});",
      );
    });

    it("should use default empty array for serverUrls when not provided", () => {
      const authHeaders: string[] = [];

      const result = generateConfigTypes(authHeaders);

      expect(result).toContain("baseURL: string;");
    });

    it("should generate proper auth headers type when provided", () => {
      const authHeaders = ["authorization", "x-api-key"];
      const serverUrls = ["https://api.example.com"];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain(
        "export type AuthHeaders = 'authorization' | 'x-api-key';",
      );
      expect(result).toContain("[K in AuthHeaders]?: string;");
    });

    it("should fallback to string type for headers when no auth headers", () => {
      const authHeaders: string[] = [];
      const serverUrls = ["https://api.example.com"];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).not.toContain("export type AuthHeaders");
      expect(result).toContain("[K in string]?: string;");
    });

    it("should escape special characters in server URLs", () => {
      const authHeaders: string[] = [];
      const serverUrls = [
        "https://api.example.com/v1",
        "https://api-test.example.com/api",
        "https://localhost:3000/api",
      ];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain(
        "baseURL: 'https://api.example.com/v1' | 'https://api-test.example.com/api' | 'https://localhost:3000/api' | (string & {});",
      );
    });

    it("should use first server URL as default baseURL", () => {
      const authHeaders = ["custom-token"];
      const serverUrls = [
        "https://localhost/api/v1",
        "https://localhost/api/v2",
      ];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain("baseURL: 'https://localhost/api/v1',");
    });

    it("should use empty string as default when no servers", () => {
      const authHeaders = ["custom-token"];
      const serverUrls: string[] = [];

      const result = generateConfigTypes(authHeaders, serverUrls);

      expect(result).toContain("baseURL: '',");

      /* Verify the complete output structure for integration testing */
      expect(result).toContain("// Configuration types");
      expect(result).toContain("export interface GlobalConfig");
      expect(result).toContain("export type AuthHeaders = 'custom-token';");
      expect(result).toContain("// Default global configuration - immutable");
      expect(result).toContain("export const globalConfig: GlobalConfig");
      expect(result).toContain("export type ApiResponse<S extends number, T>");
      expect(result).toContain("export function configureOperations");
    });
  });
});
