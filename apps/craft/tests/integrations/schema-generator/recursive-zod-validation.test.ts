import { describe, it, expect } from "vitest";
import { Category } from "../generated/schemas/Category.js";

describe("Recursive Schema Validation", () => {
  describe("Category (regular recursive schema)", () => {
    it("should validate a simple category without subcategories", () => {
      const simpleCategory = { name: "Electronics" };
      const result = Category.safeParse(simpleCategory);
      expect(result.success).toBe(true);
    });

    it("should validate a category with recursive subcategories", () => {
      const recursiveCategory = {
        name: "Electronics",
        subcategories: [
          { name: "Laptops" },
          {
            name: "Phones",
            subcategories: [{ name: "iPhone" }, { name: "Android" }],
          },
        ],
      };
      const result = Category.safeParse(recursiveCategory);
      expect(result.success).toBe(true);
    });

    it("should validate deeply nested recursive categories", () => {
      const deepCategory = {
        name: "Level 1",
        subcategories: [
          {
            name: "Level 2",
            subcategories: [
              {
                name: "Level 3",
                subcategories: [
                  {
                    name: "Level 4",
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = Category.safeParse(deepCategory);
      expect(result.success).toBe(true);
    });

    it("should allow additional properties (non-strict)", () => {
      const categoryWithExtra = {
        name: "Electronics",
        extraProp: "allowed",
      };
      const result = Category.safeParse(categoryWithExtra);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference with recursive schemas", () => {
    it("should infer correct TypeScript types for recursive category", () => {
      const category: typeof Category._output = {
        name: "Electronics",
        subcategories: [
          {
            name: "Laptops",
            subcategories: [],
          },
        ],
      };

      // This should compile without TypeScript errors
      expect(category.name).toBe("Electronics");
      expect(category.subcategories?.[0]?.name).toBe("Laptops");
    });
  });
});
