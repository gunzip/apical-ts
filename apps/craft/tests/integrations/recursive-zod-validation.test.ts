import { describe, it, expect } from "vitest";
import { Category } from "../integrations/generated/schemas/Category.js";
import { NotificationEvent } from "../integrations/generated/schemas/NotificationEvent.js";

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

  describe("NotificationEvent (allOf self-reference)", () => {
    it("should validate a simple event without template", () => {
      const event = {
        id: 1,
        name: "Issue Created",
        description: "Fired when an issue is created",
      };
      const result = NotificationEvent.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should validate an event with a recursive templateEvent", () => {
      const event = {
        id: 1,
        name: "Custom Event",
        description: "A custom event",
        templateEvent: {
          id: 2,
          name: "Template",
          description: "The base template",
        },
      };
      const result = NotificationEvent.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should validate deeply nested templateEvent recursion", () => {
      const event = {
        id: 1,
        name: "Level 1",
        templateEvent: {
          id: 2,
          name: "Level 2",
          templateEvent: {
            id: 3,
            name: "Level 3",
          },
        },
      };
      const result = NotificationEvent.safeParse(event);
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
