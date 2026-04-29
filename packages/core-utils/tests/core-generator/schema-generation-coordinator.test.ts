import { describe, expect, it } from "vitest";

import { generateFallbackSchemaContent } from "../../src/core-generator/schema-generation-coordinator.js";

describe("core-generator schema-generation-coordinator", () => {
  describe("generateFallbackSchemaContent", () => {
    it("should preserve true boolean component schema semantics", () => {
      const result = generateFallbackSchemaContent("AllowAnything", true);

      expect(result).toContain("export const AllowAnything = z.unknown();");
      expect(result).not.toContain("z.never()");
    });

    it("should preserve false boolean component schema semantics", () => {
      const result = generateFallbackSchemaContent("AllowNothing", false);

      expect(result).toContain("export const AllowNothing = z.never();");
      expect(result).not.toContain("z.unknown()");
    });
  });
});
