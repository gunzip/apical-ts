import { describe, expect, it } from "vitest";

import { zodSchemaToCode } from "../src/schema-generator/schema-converter.js";

/**
 * Helper function to evaluate Zod schema code for testing
 */
function evalZod(zodCode: string) {
  const z = require("zod");
  return eval(zodCode);
}

describe("Strict Validation Feature", () => {
  describe("loose validation (default behavior)", () => {
    it("should use z.looseObject() by default to allow extra properties", () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          age: { type: "number" as const },
        },
        required: ["name"],
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).toContain("z.looseObject");
      expect(result.code).not.toContain("z.object(");

      const zodSchema = evalZod(result.code);
      
      // Should accept valid objects
      expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
      
      // Should allow extra properties (loose validation)
      expect(zodSchema.safeParse({ name: "John", age: 30, extra: "allowed" }).success).toBe(true);
      
      // Should still reject invalid types
      expect(zodSchema.safeParse({ name: 123 }).success).toBe(false);
    });

    it("should use z.looseObject() for nested objects by default", () => {
      const schema = {
        type: "object" as const,
        properties: {
          user: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
            },
          },
        },
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).toContain("z.looseObject");
      
      const zodSchema = evalZod(result.code);
      
      // Should allow extra properties in nested objects
      expect(zodSchema.safeParse({ 
        user: { name: "John", extraField: "allowed" },
        extraTopLevel: "also allowed"
      }).success).toBe(true);
    });
  });

  describe("strict validation (opt-in behavior)", () => {
    it("should use z.object() when strictValidation is true", () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          age: { type: "number" as const },
        },
        required: ["name"],
      };

      const result = zodSchemaToCode(schema, { strictValidation: true });
      expect(result.code).toContain("z.object(");
      expect(result.code).not.toContain("z.looseObject");

      const zodSchema = evalZod(result.code);
      
      // Should accept valid objects
      expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
      
      // Should reject extra properties (strict validation)
      expect(zodSchema.safeParse({ name: "John", age: 30, extra: "not allowed" }).success).toBe(false);
      
      // Should still reject invalid types
      expect(zodSchema.safeParse({ name: 123 }).success).toBe(false);
    });

    it("should use z.object() for nested objects when strictValidation is true", () => {
      const schema = {
        type: "object" as const,
        properties: {
          user: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
            },
          },
        },
      };

      const result = zodSchemaToCode(schema, { strictValidation: true });
      expect(result.code).toContain("z.object(");
      expect(result.code).not.toContain("z.looseObject");
      
      const zodSchema = evalZod(result.code);
      
      // Should reject extra properties in nested objects
      expect(zodSchema.safeParse({ 
        user: { name: "John", extraField: "not allowed" }
      }).success).toBe(false);
      
      // Should reject extra properties at top level
      expect(zodSchema.safeParse({ 
        user: { name: "John" },
        extraTopLevel: "not allowed"
      }).success).toBe(false);
      
      // Should accept valid objects without extra properties
      expect(zodSchema.safeParse({ 
        user: { name: "John" }
      }).success).toBe(true);
    });
  });

  describe("consistency across schema types", () => {
    it("should apply strictValidation consistently to discriminated unions", () => {
      const schema = {
        oneOf: [
          {
            type: "object" as const,
            properties: {
              type: { type: "string" as const, enum: ["circle"] },
              radius: { type: "number" as const },
            },
            required: ["type", "radius"],
          },
          {
            type: "object" as const,
            properties: {
              type: { type: "string" as const, enum: ["square"] },
              size: { type: "number" as const },
            },
            required: ["type", "size"],
          },
        ],
        discriminator: { propertyName: "type" },
      };

      // Test loose validation (default)
      const looseResult = zodSchemaToCode(schema);
      expect(looseResult.code).toContain("z.looseObject");
      expect(looseResult.code).not.toContain("z.object(");

      // Test strict validation
      const strictResult = zodSchemaToCode(schema, { strictValidation: true });
      expect(strictResult.code).toContain("z.object(");
      expect(strictResult.code).not.toContain("z.looseObject");
    });

    it("should apply strictValidation consistently to array items", () => {
      const schema = {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
          },
        },
      };

      // Test loose validation (default)
      const looseResult = zodSchemaToCode(schema);
      expect(looseResult.code).toContain("z.looseObject");

      // Test strict validation
      const strictResult = zodSchemaToCode(schema, { strictValidation: true });
      expect(strictResult.code).toContain("z.object(");
      expect(strictResult.code).not.toContain("z.looseObject");
    });
  });
});