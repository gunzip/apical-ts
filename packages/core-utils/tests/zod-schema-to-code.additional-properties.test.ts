import { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { zodSchemaToCode } from "../src/schema-generator/index.js";

function evalZod(code: string, bindings: Record<string, unknown> = {}) {
  const bindingNames = Object.keys(bindings);
  const bindingValues = Object.values(bindings);
  return new Function("z", ...bindingNames, `return ${code}`)(
    z,
    ...bindingValues,
  );
}

describe("zodSchemaToCode additional-properties", () => {
  describe("additionalProperties handling", () => {
    it("should allow additional properties when additionalProperties is not specified", () => {
      const schema: SchemaObject = {
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
        type: "object",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe('z.object({"name": z.string()})');

      const zodSchema = evalZod(result.code);
      expect(
        zodSchema.safeParse({ name: "test", extra: "allowed" }).success,
      ).toBe(true);
    });

    it("should not allow additional properties when additionalProperties is false", () => {
      const schema: SchemaObject = {
        additionalProperties: false,
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
        type: "object",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe('z.strictObject({"name": z.string()})');

      const zodSchema = evalZod(result.code);
      expect(zodSchema.safeParse({ name: "test" }).success).toBe(true);
      expect(
        zodSchema.safeParse({ name: "test", extra: "not-allowed" }).success,
      ).toBe(false);
    });

    it("should allow additional properties when additionalProperties is true", () => {
      const schema: SchemaObject = {
        additionalProperties: true,
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
        type: "object",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe(
        'z.object({"name": z.string()}).catchall(z.unknown())',
      );

      const zodSchema = evalZod(result.code);
      expect(
        zodSchema.safeParse({ name: "test", extra: "allowed" }).success,
      ).toBe(true);
    });

    it("should validate additional properties with schema when additionalProperties is an object", () => {
      const schema: SchemaObject = {
        additionalProperties: { type: "number" },
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
        type: "object",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe(
        'z.object({"name": z.string()}).catchall(z.number())',
      );

      const zodSchema = evalZod(result.code);
      expect(zodSchema.safeParse({ name: "test", count: 42 }).success).toBe(
        true,
      );
      expect(
        zodSchema.safeParse({ name: "test", count: "not-a-number" }).success,
      ).toBe(false);
    });

    it("should handle nested objects with undefined additionalProperties correctly", () => {
      const schema: SchemaObject = {
        properties: {
          attributes: {
            properties: {
              properties: {
                type: "object",
              },
            },
            required: ["properties"],
            type: "object",
          },
        },
        required: ["attributes"],
        type: "object",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe(
        'z.object({"attributes": z.object({"properties": z.object({}).catchall(z.unknown())})})',
      );

      const zodSchema = evalZod(result.code);
      /* All objects should allow additional properties */
      expect(
        zodSchema.safeParse({
          attributes: {
            properties: { extra: "allowed" },
            additionalAttr: "also-allowed",
          },
          extraTop: "top-level-allowed",
        }).success,
      ).toBe(true);
    });

    it("should generate z.object({}).passthrough() for empty objects that should accept any properties", () => {
      const schema: SchemaObject = {
        type: "object",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe("z.object({}).catchall(z.unknown())");

      const zodSchema = evalZod(result.code);
      /* Should accept any properties */
      expect(
        zodSchema.safeParse({ anyProperty: "any value", count: 42, flag: true })
          .success,
      ).toBe(true);
      expect(zodSchema.safeParse({}).success).toBe(true);
    });

    it("should still generate z.strictObject({}) for empty objects with additionalProperties: false", () => {
      const schema: SchemaObject = {
        type: "object",
        additionalProperties: false,
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe("z.strictObject({})");

      const zodSchema = evalZod(result.code);
      /* Should reject any additional properties */
      expect(zodSchema.safeParse({}).success).toBe(true);
      expect(zodSchema.safeParse({ anyProperty: "any value" }).success).toBe(
        false,
      );
    });
  });
});
