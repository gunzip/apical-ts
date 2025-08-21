import { describe, test, expect } from "vitest";
import { sanitizeIdentifier } from "../src/schema-generator/utils.js";

describe("sanitizeIdentifier", () => {
  test("converts kebab-case to camelCase", () => {
    const result1 = sanitizeIdentifier("discount-per-redemption");
    expect(result1).toBe("discountPerRedemption");

    const result2 = sanitizeIdentifier("user-profile");
    expect(result2).toBe("userProfile");

    const result3 = sanitizeIdentifier("api-key");
    expect(result3).toBe("apiKey");
  });

  test("converts snake_case to camelCase", () => {
    expect(sanitizeIdentifier("some_snake_case")).toBe("someSnakeCase");
    expect(sanitizeIdentifier("test_value")).toBe("testValue");
  });

  test("handles reserved keywords", () => {
    expect(sanitizeIdentifier("in")).toBe("inSchema");
    expect(sanitizeIdentifier("class")).toBe("classSchema");
    expect(sanitizeIdentifier("function")).toBe("functionSchema");
    expect(sanitizeIdentifier("if")).toBe("ifSchema");
  });

  test("handles numbers at the start", () => {
    expect(sanitizeIdentifier("123test")).toBe("_123test");
    expect(sanitizeIdentifier("1-api-key")).toBe("_1ApiKey");
  });

  test("handles empty strings", () => {
    expect(() => sanitizeIdentifier("")).toThrow(
      "Cannot sanitize empty string to identifier"
    );
    expect(() => sanitizeIdentifier("   ")).toThrow(
      "Cannot sanitize whitespace-only string to identifier"
    );
  });

  test("handles special characters", () => {
    expect(sanitizeIdentifier("test@example.com")).toBe("testExampleCom");
    expect(sanitizeIdentifier("api#key!")).toBe("apiKey");
  });

  test("handles mixed cases", () => {
    expect(sanitizeIdentifier("Test-Mixed_Case123")).toBe("TestMixedCase123");
    expect(sanitizeIdentifier("test-Mixed_Case123")).toBe("testMixedCase123");
  });

  test("handles only special characters", () => {
    expect(() => sanitizeIdentifier("---")).toThrow("Cannot sanitize string");
    expect(() => sanitizeIdentifier("___")).toThrow("Cannot sanitize string");
  });
});
