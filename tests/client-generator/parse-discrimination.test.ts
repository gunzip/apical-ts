import { describe, expect, it } from "vitest";
import { renderApiResponseTypes } from "../../src/client-generator/templates/config-templates.js";

/**
 * This test ensures the generated ApiResponseWithParse type produces a discriminated union
 * where parsed narrows to the specific content-type schema, NOT the union of all.
 */
describe("ApiResponseWithParse discriminated parse narrowing", () => {
  it("should generate parse() signature with per-content-type parsed narrowing", () => {
    const code = renderApiResponseTypes();
    // Should use z.infer<Map[`S`][K]> not the broader ExtractResponseUnion
    expect(code).toContain("parsed: z.infer<Map");
    // Template literal in emitted code uses `${S}` inside brackets
    expect(code).toContain("parsed: z.infer<Map[`${S}`][K]>");
    // Should no longer contain the old broader helper usage inside parse mapping
    expect(code).not.toContain("parsed: ExtractResponseUnion<Map,");
  });
});
