import { describe, expect, it } from "vitest";

import type { AllOfTest } from "./generated/schemas/AllOfTest.ts";
import type { AllOfWithEmptyObjectAndRequireTest } from "./generated/schemas/AllOfWithEmptyObjectAndRequireTest.ts";
import type { AllOfWithMixedTest } from "./generated/schemas/AllOfWithMixedTest.ts";

describe("AllOf Schema Composition Integration", () => {
  describe("Object spread optimization", () => {
    it("should generate flat object with spread syntax for compatible allOf", () => {
      // Test that AllOfTest uses object spread instead of nested intersections

      // This should compile without issues if the type is properly flattened
      const validAllOfTest: AllOfTest = {
        items: [], // optional field from first schema
        page_size: 10, // from PaginationResponse
        next: "https://example.com/next", // from PaginationResponse
        id: "test-id", // from NewModel
        name: "test", // from NewModel
      };

      // Type assertion to verify structure
      expect(typeof validAllOfTest).toBe("object");
      expect(validAllOfTest.items).toEqual([]);
      expect(validAllOfTest.page_size).toBe(10);
      expect(validAllOfTest.name).toBe("test");
    });

    it("should properly handle required fields from empty objects in allOf", () => {
      // Test AllOfWithEmptyObjectAndRequireTest where items becomes required
      // due to empty object with required: [items]

      // This should compile correctly with items as required
      // @ts-expect-error
      const _: AllOfWithEmptyObjectAndRequireTest = {
        id: "test-id", // from NewModel
        name: "test", // from NewModel
      };
    });

    it("should fall back to intersection for non-object types in allOf", () => {
      // Test AllOfWithMixedTest that contains string and email types
      // This should use z.intersection instead of object spread

      // Note: This type will be complex due to intersection with primitive types
      // We're mainly testing that it compiles and doesn't break
      const mixedTestType = {} as AllOfWithMixedTest;

      // The type should still be assignable and work at runtime
      expect(typeof mixedTestType).toBe("object");
    });
  });

  describe("Generated schema validation", () => {
    it("should validate AllOfTest schema correctly", async () => {
      // Import the actual Zod schema
      const { AllOfTest: AllOfTestSchema } =
        await import("./generated/schemas/AllOfTest.ts");

      // Test valid data
      const validData = {
        items: [
          {
            id: "1",
            content: {
              markdown:
                "This is a long test message that exceeds 80 characters to satisfy the markdown field validation requirements for the MessageBodyMarkdown schema.",
            },
          },
        ],
        page_size: 10,
        next: "https://example.com/next",
        id: "test-id",
        name: "test",
      };

      const result = AllOfTestSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.name).toBe("test");
      }
    });

    it("should validate AllOfWithEmptyObjectAndRequireTest with required items", async () => {
      // Import the actual Zod schema
      const { AllOfWithEmptyObjectAndRequireTest: RequireTestSchema } =
        await import("./generated/schemas/AllOfWithEmptyObjectAndRequireTest.ts");

      // Test that items is required
      const invalidData = {
        id: "test-id",
        name: "test",
        // missing items - should fail validation
      };

      const invalidResult = RequireTestSchema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);

      if (!invalidResult.success) {
        expect(invalidResult.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ["items"],
              code: "invalid_type",
            }),
          ]),
        );
      }

      // Test valid data with required items
      const validData = {
        items: [
          {
            id: "1",
            content: {
              markdown:
                "This is a long test message that exceeds 80 characters to satisfy the markdown field validation requirements for the MessageBodyMarkdown schema.",
            },
          },
        ],
        id: "test-id",
        name: "test",
      };

      const validResult = RequireTestSchema.safeParse(validData);
      expect(validResult.success).toBe(true);

      if (validResult.success) {
        expect(validResult.data.items).toHaveLength(1);
        expect(validResult.data.name).toBe("test");
      }
    });

    it("should handle optional items in regular AllOfTest", async () => {
      // Import the actual Zod schema
      const { AllOfTest: AllOfTestSchema } =
        await import("./generated/schemas/AllOfTest.ts");

      // Test that items is optional in regular AllOfTest
      const dataWithoutItems = {
        page_size: 10,
        next: "https://example.com/next",
        id: "test-id",
        name: "test",
        // items omitted - should be valid since it's optional
      };

      const result = AllOfTestSchema.safeParse(dataWithoutItems);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.items).toBeUndefined();
        expect(result.data.name).toBe("test");
      }
    });
  });

  describe("Code generation verification", () => {
    it("should generate object spread syntax for AllOfTest", async () => {
      // Read the generated file content to verify syntax
      const fs = await import("fs/promises");
      const path = "./tests/integrations/generated/schemas/AllOfTest.ts";
      const content = await fs.readFile(path, "utf-8");

      // Verify it uses z.object with spread syntax
      expect(content).toContain("z.object({");
      expect(content).toContain("...z.object");
      expect(content).toContain(".shape");

      // Verify it doesn't use intersection
      expect(content).not.toContain("z.intersection");
    });

    it("should generate required field for AllOfWithEmptyObjectAndRequireTest", async () => {
      // Read the generated file content to verify required field
      const fs = await import("fs/promises");
      const path =
        "./tests/integrations/generated/schemas/AllOfWithEmptyObjectAndRequireTest.ts";
      const content = await fs.readFile(path, "utf-8");

      // Verify items is not marked as optional
      expect(content).not.toContain("z.array(Message).optional()");

      // Verify items is required (no .optional())
      expect(content).toContain("z.array(Message)");
      expect(content).toContain("z.object({");
    });

    it("should generate intersection for mixed types", async () => {
      // Read the generated file content to verify intersection fallback
      const fs = await import("fs/promises");
      const path =
        "./tests/integrations/generated/schemas/AllOfWithMixedTest.ts";
      const content = await fs.readFile(path, "utf-8");

      // Verify it uses intersection for mixed types
      expect(content).toContain("z.intersection");
      expect(content).toContain("z.email()");
      expect(content).toContain("z.string().max(50)");
    });

    it("should generate getter syntax for allOf self-referencing property", async () => {
      const fs = await import("fs/promises");
      const path =
        "./tests/integrations/generated/schemas/NotificationEvent.ts";
      const content = await fs.readFile(path, "utf-8");

      // Verify it uses getter syntax for the self-referencing templateEvent
      expect(content).toContain('get "templateEvent"()');

      // Verify it does NOT import itself
      expect(content).not.toContain("import { NotificationEvent }");

      // Verify it doesn't use the broken direct assignment pattern
      expect(content).not.toMatch(/"templateEvent":\s*z\.object/);

      // Verify it does NOT use .shape spread (would cause infinite recursion)
      expect(content).not.toContain("NotificationEvent.shape");
    });
  });
});
