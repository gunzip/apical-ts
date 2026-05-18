import { describe, expect, it } from "vitest";

/* Import the function we want to test */
import { renderUtilityFunctions } from "../src/templates/config/index.js";

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

      /* Should have overload without deserializers */
      expect(result).toContain("export function parseApiResponseUnknownData<");
      expect(result).toContain(
        "export async function parseApiResponseUnknownData<",
      );

      /* Should contain the discriminated union return types */
      expect(result).toContain("contentType: K;");
      expect(result).toContain("parsed: StandardSchemaV1.InferOutput<");
      expect(result).toContain('kind: "parse-error"; error:');
      expect(result).toContain('kind: "missing-schema"; error:');

      /* Should use Standard Schema inference in type definitions */
      expect(result).toContain("StandardSchemaV1.InferOutput<TSchemaMap[K]>");
    });

    it("should include proper overloads for with/without deserializers", () => {
      const result = renderUtilityFunctions();

      /* Should have two overloads */
      const overloadMatches = result.match(
        /export function parseApiResponseUnknownData</g,
      );
      expect(overloadMatches).toHaveLength(2); // 2 overloads
      expect(result).toContain(
        "export async function parseApiResponseUnknownData<",
      );

      /* Should handle deserializationError correctly */
      expect(result).toContain('kind: "deserialization-error"');
    });
  });

  describe("function behavior", () => {
    it("should return correct discriminated union for successful parsing", () => {
      const utilityCode = renderUtilityFunctions();

      /* Extract the function implementation */
      expect(utilityCode).toContain("if (result.success)");
      expect(utilityCode).toContain("return createParsedApiResponse(");
      expect(utilityCode).toContain("result.value");
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

    it("should handle deserialization errors when deserializers provided", () => {
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

      /* Should use Standard Schema types */
      expect(utilityCode).toContain("StandardSchemaV1.InferOutput");
    });

    it("should have correct constraint on TSchemaMap", () => {
      const utilityCode = renderUtilityFunctions();

      /* Should use StandardSchemaV1 as the constraint */
      expect(utilityCode).toContain(
        "TSchemaMap extends Record<string, StandardSchemaV1>",
      );
    });

    it("should not use structural safeParse constraint (regression guard for #167)", () => {
      const utilityCode = renderUtilityFunctions();

      /* The old structural { safeParse: ... } constraint caused expensive
       * deep structural comparison for every Zod schema at each call site.
       * Ensure it is not reintroduced. */
      expect(utilityCode).not.toContain(
        "{ safeParse: (value: unknown) => z.ZodSafeParseResult<unknown> }",
      );
    });
  });
});
