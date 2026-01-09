import { describe, expect, it } from "vitest";

import { zodSchemaToCode } from "@apical-ts/core-utils";

/**
 * Helper function to evaluate Zod schema code for testing
 */
function evalZod(zodCode: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const z = require("zod");
  // eslint-disable-next-line no-eval
  return eval(zodCode);
}

describe("Additional Properties Feature", () => {
  describe("loose validation (default behavior)", () => {
    it("should use z.object() by default to allow extra properties", () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          age: { type: "number" as const },
        },
        required: ["name"],
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).toContain("z.object");
      expect(result.code).not.toContain("z.strictObject");

      const zodSchema = evalZod(result.code);

      // Should accept valid objects
      expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);

      // Should allow extra properties (loose validation)
      expect(
        zodSchema.safeParse({ name: "John", age: 30, extra: "allowed" })
          .success,
      ).toBe(true);

      // Should still reject invalid types
      expect(zodSchema.safeParse({ name: 123 }).success).toBe(false);
    });

    it("should use z.object() for nested objects by default", () => {
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
      expect(result.code).toContain("z.object");

      const zodSchema = evalZod(result.code);

      // Should allow extra properties in nested objects
      expect(
        zodSchema.safeParse({
          user: { name: "John", extraField: "allowed" },
          extraTopLevel: "also allowed",
        }).success,
      ).toBe(true);
    });
  });

  describe("strict validation (additionalProperties: false)", () => {
    it("should use z.strictObject() when additionalProperties is false", () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          age: { type: "number" as const },
        },
        required: ["name"],
        additionalProperties: false,
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).toContain("z.strictObject(");
      expect(result.code).not.toContain("z.object");

      const zodSchema = evalZod(result.code);

      // Should accept valid objects
      expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);

      // Should reject extra properties since additionalProperties: false
      expect(
        zodSchema.safeParse({ name: "John", age: 30, extra: "not allowed" })
          .success,
      ).toBe(false);

      // Should still reject invalid types
      expect(zodSchema.safeParse({ name: 123 }).success).toBe(false);
    });

    it("should use z.strictObject() for nested objects when additionalProperties is false", () => {
      const schema = {
        type: "object" as const,
        properties: {
          user: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).toContain("z.strictObject(");
      expect(result.code).not.toContain("z.object");

      const zodSchema = evalZod(result.code);

      // Should reject extra properties in nested objects
      expect(
        zodSchema.safeParse({
          user: { name: "John", extraField: "not allowed" },
        }).success,
      ).toBe(false);

      // Should reject extra properties at top level
      expect(
        zodSchema.safeParse({
          user: { name: "John" },
          extraTopLevel: "not allowed",
        }).success,
      ).toBe(false);

      // Should accept valid objects without extra properties
      expect(
        zodSchema.safeParse({
          user: { name: "John" },
        }).success,
      ).toBe(true);
    });
  });

  describe("consistency across schema types", () => {
    it("should apply additionalProperties consistently to discriminated unions", () => {
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
      const looseResult = zodSchemaToCode(schema as any);
      expect(looseResult.code).toContain("z.object");
      expect(looseResult.code).not.toContain("z.strictObject");

      // Test strict validation
      const strictSchema = {
        ...schema,
        oneOf: schema.oneOf.map((s) => ({ ...s, additionalProperties: false })),
      };
      const strictResult = zodSchemaToCode(strictSchema as any);
      expect(strictResult.code).toContain("z.strictObject");
      expect(strictResult.code).not.toContain("z.object");
    });

    it("should apply additionalProperties consistently to array items", () => {
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
      expect(looseResult.code).toContain("z.object");

      // Test strict validation
      const strictSchema = {
        ...schema,
        items: {
          ...schema.items,
          additionalProperties: false,
        },
      };
      const strictResult = zodSchemaToCode(strictSchema);
      expect(strictResult.code).toContain("z.strictObject(");
      expect(strictResult.code).not.toContain("z.object");
    });
  });
});
