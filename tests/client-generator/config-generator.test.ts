import { describe, expect, it } from "vitest";

import { generateConfigTypes } from "../../src/client-generator/config-generator.js";

describe("client-generator config-generator", () => {
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
    });
  });
});
