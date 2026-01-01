import { describe, expect, it } from "vitest";

import {
  createUserWithRequestBodies,
  CreateUserWithRequestBodiesRequestMap,
  CreateUserWithRequestBodiesResponseMap,
} from "./generated/client/createUserWithRequestBodies.js";
import { Profile } from "./generated/schemas/Profile.js";

describe("Request Bodies Unit Tests", () => {
  describe("CreateUserWithRequestBodies operation", () => {
    it("should have correct request map type", () => {
      // Verify that the request map is correctly typed
      type RequestMap = typeof CreateUserWithRequestBodiesRequestMap;

      // Should have application/json content type
      const hasJsonContentType: "application/json" extends keyof RequestMap
        ? true
        : false = true;
      expect(hasJsonContentType).toBe(true);

      // The request body should be of type Profile
      const requestBody: Profile = {
        fiscal_code: "SPNDNL80R13C555X",
        family_name: "Doe",
        has_profile: true,
        is_email_set: true,
        name: "John",
        version: 1,
      };

      expect(requestBody).toBeDefined();
    });
    it("should have correct response map structure", () => {
      // Verify response map has expected status codes
      expect(CreateUserWithRequestBodiesResponseMap).toHaveProperty("201");
      expect(CreateUserWithRequestBodiesResponseMap).toHaveProperty("400");

      // Verify response content types
      expect(CreateUserWithRequestBodiesResponseMap["201"]).toHaveProperty(
        "application/json",
      );
      expect(CreateUserWithRequestBodiesResponseMap["400"]).toHaveProperty(
        "application/json",
      );
    });

    it("should validate Profile schema in request body", () => {
      // Test that the Profile schema validates correctly
      const validProfile = {
        fiscal_code: "SPNDNL80R13C555X",
        family_name: "Doe",
        has_profile: true,
        is_email_set: true,
        name: "John",
        version: 1,
      };

      // This should not throw an error at runtime (type-level validation)
      const result = Profile.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it("should reject invalid Profile data", () => {
      // Test invalid profile data
      const invalidProfile = {
        // Missing required fiscal_code
        family_name: "Doe",
        has_profile: true,
        is_email_set: true,
        name: "John",
        version: 1,
      };

      const result = Profile.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it("should handle optional fields in Profile", () => {
      // Test profile with optional fields
      const profileWithOptionals = {
        fiscal_code: "SPNDNL80R13C555X",
        family_name: "Doe",
        has_profile: true,
        is_email_set: true,
        name: "John",
        version: 1,
        email: "john.doe@example.com",
        preferred_email: "john.doe@example.com",
        is_inbox_enabled: true,
        is_webhook_enabled: false,
        preferred_languages: ["en_US", "it_IT"],
        payload: { customField: "value" },
      };

      const result = Profile.safeParse(profileWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("Request body type safety", () => {
    it("should enforce type safety for request body content", () => {
      // This test verifies that TypeScript enforces the correct types
      // The function signature should require the correct request body type

      const mockConfig = {
        baseURL: "http://example.com",
        fetch: async () => new Response(JSON.stringify({}), { status: 201 }),
        headers: { "custom-token": "" },
        forceValidation: false,
      };

      // Valid request body
      const validBody = {
        fiscal_code: "SPNDNL80R13C555X",
        family_name: "Doe",
        has_profile: true,
        is_email_set: true,
        name: "John",
        version: 1,
      };

      // This should compile without type errors
      const promise = createUserWithRequestBodies(
        { body: validBody },
        mockConfig,
      );

      expect(promise).toBeInstanceOf(Promise);
    });

    it("should support different content types in request map", () => {
      // Verify that the request map can support multiple content types
      // Currently only application/json is supported, but this test ensures
      // the type system is set up correctly for future extensions

      type RequestMap = typeof CreateUserWithRequestBodiesRequestMap;
      const contentTypes: (keyof RequestMap)[] = ["application/json"];

      expect(contentTypes).toContain("application/json");
    });
  });

  describe("Request body schema validation", () => {
    it("should validate fiscal code format", () => {
      // Test the fiscal code regex pattern
      const validFiscalCodes = [
        "SPNDNL80R13C555X",
        "RSSMRA85T10A562S",
        "VRDGPP87L11H501Z",
      ];

      const invalidFiscalCodes = [
        "INVALID",
        "1234567890123456",
        "SPNDNL80R13C555", // Too short
        "SPNDNL80R13C555XX", // Too long
      ];

      for (const fiscalCode of validFiscalCodes) {
        const profile = {
          fiscal_code: fiscalCode,
          family_name: "Doe",
          has_profile: true,
          is_email_set: true,
          name: "John",
          version: 1,
        };

        const result = Profile.safeParse(profile);
        expect(result.success).toBe(true);
      }

      for (const fiscalCode of invalidFiscalCodes) {
        const profile = {
          fiscal_code: fiscalCode,
          family_name: "Doe",
          has_profile: true,
          is_email_set: true,
          name: "John",
          version: 1,
        };

        const result = Profile.safeParse(profile);
        expect(result.success).toBe(false);
      }
    });

    it("should validate email format when provided", () => {
      // Test email validation for optional email fields
      const validEmails = [
        "john.doe@example.com",
        "test.email+tag@domain.co.uk",
        "user@subdomain.example.org",
      ];

      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "user@",
        "user.example.com",
      ];

      for (const email of validEmails) {
        const profile = {
          fiscal_code: "SPNDNL80R13C555X",
          family_name: "Doe",
          has_profile: true,
          is_email_set: true,
          name: "John",
          version: 1,
          email,
          preferred_email: email,
        };

        const result = Profile.safeParse(profile);
        expect(result.success).toBe(true);
      }

      for (const email of invalidEmails) {
        const profile = {
          fiscal_code: "SPNDNL80R13C555X",
          family_name: "Doe",
          has_profile: true,
          is_email_set: true,
          name: "John",
          version: 1,
          email,
          preferred_email: email,
        };

        const result = Profile.safeParse(profile);
        expect(result.success).toBe(false);
      }
    });

    it("should validate version as integer", () => {
      // Test that version must be an integer
      const validVersions = [1, 0, 100, -1];
      const invalidVersions = [1.5, "1", null, undefined];

      for (const version of validVersions) {
        const profile = {
          fiscal_code: "SPNDNL80R13C555X",
          family_name: "Doe",
          has_profile: true,
          is_email_set: true,
          name: "John",
          version,
        };

        const result = Profile.safeParse(profile);
        expect(result.success).toBe(true);
      }

      for (const version of invalidVersions) {
        const profile = {
          fiscal_code: "SPNDNL80R13C555X",
          family_name: "Doe",
          has_profile: true,
          is_email_set: true,
          name: "John",
          version,
        };

        const result = Profile.safeParse(profile);
        expect(result.success).toBe(false);
      }
    });
  });
});
