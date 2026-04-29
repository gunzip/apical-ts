import { describe, expect, it } from "vitest";

import type { SecurityHeader } from "@apical-ts/core-utils/shared";
import {
  renderAuthHeaderValidation,
  renderSecurityHeaderHandling,
  renderSecurityParameterExtraction,
} from "../src/templates/security-templates.js";

describe("client-generator security templates", () => {
  describe("renderSecurityHeaderHandling", () => {
    it("should render required header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isOverride: true,
          isRequired: true,
          schemeName: "apiKey",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        'const _sec_XAPIKey = params.headers["X-API-Key"];\n    if (_sec_XAPIKey === undefined) throw new Error("Missing required security header: X-API-Key");\n    finalHeaders["X-API-Key"] = _sec_XAPIKey;',
      );
    });

    it("should render optional header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isOverride: true,
          isRequired: false,
          schemeName: "apiKey",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        'const _sec_XAPIKey = params.headers?.["X-API-Key"];\n    if (_sec_XAPIKey !== undefined) finalHeaders["X-API-Key"] = _sec_XAPIKey;',
      );
    });

    it("should render multiple header assignments", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isOverride: true,
          isRequired: true,
          schemeName: "apiKey",
        },
        {
          headerName: "Authorization",
          isOverride: true,
          isRequired: false,
          schemeName: "bearerAuth",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        'const _sec_XAPIKey = params.headers["X-API-Key"];\n    if (_sec_XAPIKey === undefined) throw new Error("Missing required security header: X-API-Key");\n    finalHeaders["X-API-Key"] = _sec_XAPIKey;\n' +
          '    const _sec_Authorization = params.headers?.["Authorization"];\n    if (_sec_Authorization !== undefined) finalHeaders["Authorization"] = _sec_Authorization;',
      );
    });

    it("should handle complex header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Custom-Auth-Token",
          isOverride: true,
          isRequired: true,
          schemeName: "customAuth",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        'const _sec_XCustomAuthToken = params.headers["X-Custom-Auth-Token"];\n    if (_sec_XCustomAuthToken === undefined) throw new Error("Missing required security header: X-Custom-Auth-Token");\n    finalHeaders["X-Custom-Auth-Token"] = _sec_XCustomAuthToken;',
      );
    });

    it("should return empty string for empty headers array", () => {
      const result = renderSecurityHeaderHandling([]);
      expect(result).toBe("");
    });

    it("should handle special characters in header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Special@Header",
          isOverride: true,
          isRequired: true,
          schemeName: "special",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        'const _sec_XSpecialHeader = params.headers["X-Special@Header"];\n    if (_sec_XSpecialHeader === undefined) throw new Error("Missing required security header: X-Special@Header");\n    finalHeaders["X-Special@Header"] = _sec_XSpecialHeader;',
      );
    });

    it("should deduplicate headers with same headerName, preferring isRequired", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Auth-Email",
          isOverride: true,
          isRequired: true,
          schemeName: "api_email",
        },
        {
          headerName: "X-Auth-Key",
          isOverride: true,
          isRequired: true,
          schemeName: "api_key",
        },
        {
          headerName: "X-Auth-Email",
          isOverride: true,
          isRequired: false,
          schemeName: "api_email_2",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toContain("_sec_XAuthEmail");
      expect(result).toContain("_sec_XAuthKey");

      const emailOccurrences = result.split("const _sec_XAuthEmail").length - 1;
      expect(emailOccurrences).toBe(1);

      expect(result).toContain(
        "if (_sec_XAuthEmail === undefined) throw new Error",
      );
    });

    it("should preserve distinct headers whose names collide after normalization", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Auth-Email",
          isOverride: true,
          isRequired: true,
          schemeName: "api_email",
        },
        {
          headerName: "X_Auth_Email",
          isOverride: true,
          isRequired: false,
          schemeName: "api_email_alt",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);

      expect(result).toContain(
        'const _sec_XAuthEmail = params.headers["X-Auth-Email"];',
      );
      expect(result).toContain(
        "if (_sec_XAuthEmail === undefined) throw new Error",
      );
      expect(result).toContain(
        'finalHeaders["X-Auth-Email"] = _sec_XAuthEmail;',
      );
      expect(result).toContain(
        'const _sec_XAuthEmail_2 = params.headers?.["X_Auth_Email"];',
      );
      expect(result).toContain(
        'if (_sec_XAuthEmail_2 !== undefined) finalHeaders["X_Auth_Email"] = _sec_XAuthEmail_2;',
      );
    });

    it("should deduplicate headers keeping optional when no required exists", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Auth-Email",
          isOverride: true,
          isRequired: false,
          schemeName: "api_email",
        },
        {
          headerName: "X-Auth-Email",
          isOverride: true,
          isRequired: false,
          schemeName: "api_email_2",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      const emailOccurrences = result.split("const _sec_XAuthEmail").length - 1;
      expect(emailOccurrences).toBe(1);

      expect(result).toContain(
        "if (_sec_XAuthEmail !== undefined) finalHeaders",
      );
    });

    it("should generate unique local variable names for colliding header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Auth-Email",
          isOverride: true,
          isRequired: true,
          schemeName: "api_email",
        },
        {
          headerName: "X_Auth_Email",
          isOverride: true,
          isRequired: false,
          schemeName: "api_email_alt",
        },
        {
          headerName: "X Auth Email",
          isOverride: true,
          isRequired: false,
          schemeName: "api_email_space",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      const variableNames = [...result.matchAll(/const (\S+) =/g)].map(
        ([, variableName]) => variableName,
      );

      expect(variableNames).toEqual([
        "_sec_XAuthEmail",
        "_sec_XAuthEmail_2",
        "_sec_XAuthEmail_3",
      ]);
      expect(new Set(variableNames).size).toBe(variableNames.length);
    });

    it("should escape generated string literals for header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: 'X-"Quoted"\\Header\nName',
          isOverride: true,
          isRequired: true,
          schemeName: "quoted",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);

      expect(result).toContain(
        'params.headers["X-\\"Quoted\\"\\\\Header\\nName"]',
      );
      expect(result).toContain(
        'throw new Error("Missing required security header: X-\\"Quoted\\"\\\\Header\\nName")',
      );
      expect(result).toContain(
        'finalHeaders["X-\\"Quoted\\"\\\\Header\\nName"] = _sec_XQuotedHeaderName;',
      );
    });
  });

  describe("renderAuthHeaderValidation", () => {
    it("should render validation for single header", () => {
      const authHeaders = ["X-API-Key"];

      const result = renderAuthHeaderValidation(authHeaders);
      expect(result).toBe(
        'if (!XAPIKey) throw new Error("Missing required auth header: X-API-Key");',
      );
    });

    it("should render validation for multiple headers", () => {
      const authHeaders = ["X-API-Key", "Authorization"];

      const result = renderAuthHeaderValidation(authHeaders);
      expect(result).toBe(
        'if (!XAPIKey) throw new Error("Missing required auth header: X-API-Key");\n' +
          '  if (!Authorization) throw new Error("Missing required auth header: Authorization");',
      );
    });

    it("should handle complex header names", () => {
      const authHeaders = ["X-Custom-Auth-Token"];

      const result = renderAuthHeaderValidation(authHeaders);
      expect(result).toBe(
        'if (!XCustomAuthToken) throw new Error("Missing required auth header: X-Custom-Auth-Token");',
      );
    });

    it("should return empty string for empty headers array", () => {
      const result = renderAuthHeaderValidation([]);
      expect(result).toBe("");
    });
  });

  describe("renderSecurityParameterExtraction", () => {
    it("should render extraction for single header", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isOverride: false,
          isRequired: true,
          schemeName: "apiKey",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe('const XAPIKey = config.headers?.["X-API-Key"];');
    });

    it("should render extraction for multiple headers", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isOverride: false,
          isRequired: true,
          schemeName: "apiKey",
        },
        {
          headerName: "Authorization",
          isOverride: false,
          isRequired: false,
          schemeName: "bearerAuth",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe(
        'const XAPIKey = config.headers?.["X-API-Key"];\n' +
          '  const Authorization = config.headers?.["Authorization"];',
      );
    });

    it("should handle complex header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Custom-Auth-Token",
          isOverride: false,
          isRequired: true,
          schemeName: "customAuth",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe(
        'const XCustomAuthToken = config.headers?.["X-Custom-Auth-Token"];',
      );
    });

    it("should return empty string for empty headers array", () => {
      const result = renderSecurityParameterExtraction([]);
      expect(result).toBe("");
    });

    it("should handle special characters in header names", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-Special@Header",
          isOverride: false,
          isRequired: true,
          schemeName: "special",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe(
        'const XSpecialHeader = config.headers?.["X-Special@Header"];',
      );
    });

    it("should escape header names during extraction", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: 'X-"Quoted"\\Header\nName',
          isOverride: false,
          isRequired: true,
          schemeName: "quoted",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);

      expect(result).toBe(
        'const XQuotedHeaderName = config.headers?.["X-\\"Quoted\\"\\\\Header\\nName"];',
      );
    });
  });
});
