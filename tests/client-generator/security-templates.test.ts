import { describe, expect, it } from "vitest";

import type { SecurityHeader } from "../../src/client-generator/models/security-models.js";
import {
  renderAuthHeaderValidation,
  renderSecurityHeaderHandling,
  renderSecurityParameterExtraction,
} from "../../src/client-generator/templates/security-templates.js";

describe("client-generator security templates", () => {
  describe("renderSecurityHeaderHandling", () => {
    it("should render required header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isRequired: true,
          schemeName: "apiKey",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-API-Key'] = XAPIKey;");
    });

    it("should render optional header assignment", () => {
      const headers: SecurityHeader[] = [
        {
          headerName: "X-API-Key",
          isRequired: false,
          schemeName: "apiKey",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        "if (XAPIKey !== undefined) finalHeaders['X-API-Key'] = XAPIKey;",
      );
    });

    it("should render multiple header assignments", () => {
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

      const result = renderSecurityHeaderHandling(headers);
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

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe(
        "finalHeaders['X-Custom-Auth-Token'] = XCustomAuthToken;",
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
          isRequired: true,
          schemeName: "special",
        },
      ];

      const result = renderSecurityHeaderHandling(headers);
      expect(result).toBe("finalHeaders['X-Special@Header'] = XSpecialHeader;");
    });
  });

  describe("renderAuthHeaderValidation", () => {
    it("should render validation for single header", () => {
      const authHeaders = ["X-API-Key"];

      const result = renderAuthHeaderValidation(authHeaders);
      expect(result).toBe(
        "if (!XAPIKey) throw new Error('Missing required auth header: X-API-Key');",
      );
    });

    it("should render validation for multiple headers", () => {
      const authHeaders = ["X-API-Key", "Authorization"];

      const result = renderAuthHeaderValidation(authHeaders);
      expect(result).toBe(
        "if (!XAPIKey) throw new Error('Missing required auth header: X-API-Key');\n" +
          "  if (!Authorization) throw new Error('Missing required auth header: Authorization');",
      );
    });

    it("should handle complex header names", () => {
      const authHeaders = ["X-Custom-Auth-Token"];

      const result = renderAuthHeaderValidation(authHeaders);
      expect(result).toBe(
        "if (!XCustomAuthToken) throw new Error('Missing required auth header: X-Custom-Auth-Token');",
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
          isRequired: true,
          schemeName: "apiKey",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe("const XAPIKey = config.headers?.['X-API-Key'];");
    });

    it("should render extraction for multiple headers", () => {
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

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe(
        "const XAPIKey = config.headers?.['X-API-Key'];\n" +
          "  const Authorization = config.headers?.['Authorization'];",
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

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe(
        "const XCustomAuthToken = config.headers?.['X-Custom-Auth-Token'];",
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
          isRequired: true,
          schemeName: "special",
        },
      ];

      const result = renderSecurityParameterExtraction(headers);
      expect(result).toBe(
        "const XSpecialHeader = config.headers?.['X-Special@Header'];",
      );
    });
  });
});
