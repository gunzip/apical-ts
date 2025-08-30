import { describe, expect, it } from "vitest";

/* Import the function we want to test */
import { renderUtilityFunctions } from "../../src/client-generator/templates/config-templates.js";

/*
 * Test for enhanced parseApiResponseUnknownData function
 * This tests the strongly-typed overloads and discriminated union return types
 */
describe("strongly-typed parseApiResponseUnknownData", () => {
  describe("function generation", () => {
    it("should generate the enhanced parseApiResponseUnknownData function", () => {
      const result = renderUtilityFunctions();

      /* Should contain the function with proper overloads */
      expect(result).toContain("parseApiResponseUnknownData");

      /* Should have overload without deserializerMap */
      expect(result).toContain("export function parseApiResponseUnknownData<");

      /* Should contain the discriminated union return types */
      expect(result).toContain("contentType: K; parsed:");
      expect(result).toContain('kind: "parse-error"; error:');
      expect(result).toContain('kind: "missing-schema"; error:');

      /* Should use z.infer in type definitions */
      expect(result).toContain("z.infer<TSchemaMap[K]>");
    });

    it("should include proper overloads for with/without deserializerMap", () => {
      const result = renderUtilityFunctions();

      /* Should have two overloads */
      const overloadMatches = result.match(
        /export function parseApiResponseUnknownData</g,
      );
      expect(overloadMatches).toHaveLength(3); // 2 overloads + 1 implementation

      /* Should handle deserializationError correctly */
      expect(result).toContain('kind: "deserialization-error"');
    });
  });

  describe("function behavior", () => {
    it("should return correct discriminated union for successful parsing", () => {
      const utilityCode = renderUtilityFunctions();

      /* Extract the function implementation */
      expect(utilityCode).toContain("if (result.success)");
      expect(utilityCode).toContain("parsed: result.data");
    });

    it("should handle missing schema correctly", () => {
      const utilityCode = renderUtilityFunctions();
      expect(utilityCode).toContain('kind: "missing-schema"');
    });

    it("should handle validation errors correctly", () => {
      const utilityCode = renderUtilityFunctions();

      /* Should handle validation error case */
      expect(utilityCode).toContain("if (result.success)");
      expect(utilityCode).toContain('kind: "parse-error"');
    });

    it("should handle deserialization errors when deserializerMap provided", () => {
      const utilityCode = renderUtilityFunctions();
      expect(utilityCode).toContain('kind: "deserialization-error"');
    });
  });

  describe("type safety", () => {
    it("should use proper TypeScript types", () => {
      const utilityCode = renderUtilityFunctions();

      /* Should not use any */
      expect(utilityCode).not.toContain(": any");
      expect(utilityCode).not.toContain("as any");

      /* Should use proper const assertions */
      expect(utilityCode).toContain("as const");

      /* Should use proper zod types */
      expect(utilityCode).toContain("z.infer");
    });

    it("should have correct constraint on TSchemaMap", () => {
      const utilityCode = renderUtilityFunctions();

      /* Should have proper constraint on schema map */
      expect(utilityCode).toContain(
        "TSchemaMap extends Record<string, { safeParse:",
      );
      expect(utilityCode).toContain("z.ZodSafeParseResult<unknown>");
    });
  });
});
