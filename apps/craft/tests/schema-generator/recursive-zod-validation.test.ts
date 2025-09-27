import { describe, it, expect } from "vitest";
import { Category } from "../integrations/generated/schemas/Category.js";
import { CategoryStrict } from "../integrations/generated/schemas/CategoryStrict.js";

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

  describe("CategoryStrict (strict recursive schema)", () => {
    it("should validate a simple strict category without subcategories", () => {
      const simpleCategory = { name: "Electronics" };
      const result = CategoryStrict.safeParse(simpleCategory);
      expect(result.success).toBe(true);
    });

    it("should validate a strict category with recursive subcategories", () => {
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
      const result = CategoryStrict.safeParse(recursiveCategory);
      expect(result.success).toBe(true);
    });

    it("should reject additional properties (strict validation)", () => {
      const categoryWithExtra = {
        name: "Electronics",
        extraProp: "not allowed",
      };
      const result = CategoryStrict.safeParse(categoryWithExtra);
      expect(result.success).toBe(false);
      expect(result.error?.issues["0"].code).toBe("unrecognized_keys");
    });

    it("should validate deeply nested strict recursive categories", () => {
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
      const result = CategoryStrict.safeParse(deepCategory);
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
      expect(category.subcategories?.["0"]?.name).toBe("Laptops");
    });

    it("should infer correct TypeScript types for strict recursive category", () => {
      const strictCategory: typeof CategoryStrict._output = {
        name: "Electronics",
        subcategories: [
          {
            name: "Laptops",
            subcategories: [],
          },
        ],
      };

      // This should compile without TypeScript errors
      expect(strictCategory.name).toBe("Electronics");
      expect(strictCategory.subcategories?.["0"]?.name).toBe("Laptops");
    });
  });
});
