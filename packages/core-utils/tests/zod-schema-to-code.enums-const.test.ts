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

describe("zodSchemaToCode enums-const", () => {
  it("should generate z.coerce.bigint() with constraints for int64", () => {
    const schema: SchemaObject = {
      format: "int64",
      maximum: 100,
      minimum: 0,
      type: "integer",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.coerce.bigint().min(0n).max(100n)");
  });

  it("should handle x-extensible-enum for strings", () => {
    const schema: SchemaObject = {
      type: "string",
      "x-extensible-enum": ["value1", "value2", "value3"],
    } as any; // Cast to any to allow x-extensible-enum extension
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.enum(["value1", "value2", "value3"]).or(z.string())',
    );
    const zodSchema = evalZod(result.code);

    // Should accept known enum values
    expect(zodSchema.safeParse("value1").success).toBe(true);
    expect(zodSchema.safeParse("value2").success).toBe(true);
    expect(zodSchema.safeParse("value3").success).toBe(true);

    // Should also accept any other string (extensible)
    expect(zodSchema.safeParse("customValue").success).toBe(true);
    expect(zodSchema.safeParse("anotherValue").success).toBe(true);

    // Should reject non-string values
    expect(zodSchema.safeParse(123).success).toBe(false);
    expect(zodSchema.safeParse(null).success).toBe(false);
    expect(zodSchema.safeParse(undefined).success).toBe(false);
  });

  it("should handle x-extensible-enum with single value", () => {
    const schema: SchemaObject = {
      type: "string",
      "x-extensible-enum": ["ACTIVATED"],
    } as any;
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.enum(["ACTIVATED"]).or(z.string())');
    const zodSchema = evalZod(result.code);

    // Should accept the known value
    expect(zodSchema.safeParse("ACTIVATED").success).toBe(true);

    // Should also accept other strings
    expect(zodSchema.safeParse("DEACTIVATED").success).toBe(true);
    expect(zodSchema.safeParse("PENDING").success).toBe(true);
  });

  it("should prioritize x-extensible-enum over regular enum", () => {
    const schema: SchemaObject = {
      enum: ["regularEnum1", "regularEnum2"],
      type: "string",
      "x-extensible-enum": ["extensibleValue1", "extensibleValue2"],
    } as any;
    const result = zodSchemaToCode(schema);
    // Should use x-extensible-enum and generate extensible schema
    expect(result.code).toBe(
      'z.enum(["extensibleValue1", "extensibleValue2"]).or(z.string())',
    );
    expect(result.code).not.toContain("regularEnum1");
  });

  it("should handle const field as literal", () => {
    const schema: SchemaObject = { const: "fixed-value" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.literal("fixed-value")');

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("fixed-value").success).toBe(true);
    expect(zodSchema.safeParse("other-value").success).toBe(false);
  });

  it("should handle const field with number", () => {
    const schema: SchemaObject = { const: 42 };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.literal(42)");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(42).success).toBe(true);
    expect(zodSchema.safeParse(43).success).toBe(false);
  });

  it("should handle const field with boolean", () => {
    const schema: SchemaObject = { const: true };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.literal(true)");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(true).success).toBe(true);
    expect(zodSchema.safeParse(false).success).toBe(false);
  });

  it("should use z.enum for string-only enums", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["option1", "option2", "option3"],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.enum(["option1", "option2", "option3"])');

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("option1").success).toBe(true);
    expect(zodSchema.safeParse("option4").success).toBe(false);
  });

  it("should treat single enum value as literal", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["single-value"],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.literal("single-value")');

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("single-value").success).toBe(true);
    expect(zodSchema.safeParse("other-value").success).toBe(false);
  });

  it("should prioritize const over enum", () => {
    const schema: SchemaObject = {
      const: "const-value",
      enum: ["enum-value1", "enum-value2"],
      type: "string",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.literal("const-value")');

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("const-value").success).toBe(true);
    expect(zodSchema.safeParse("enum-value1").success).toBe(false);
  });

  it("should generate z.null() for const: null", () => {
    const schema: SchemaObject = { const: null };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.null()");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(null).success).toBe(true);
    expect(zodSchema.safeParse("hello").success).toBe(false);
  });

  it("should preserve exact array const values", () => {
    const schema = {
      const: [1, { enabled: true }, null],
    } as unknown as SchemaObject;
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.tuple([z.literal(1), z.strictObject({"enabled": z.literal(true)}), z.null()])',
    );

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse([1, { enabled: true }, null]).success).toBe(
      true,
    );
    expect(zodSchema.safeParse([1, { enabled: false }, null]).success).toBe(
      false,
    );
    expect(zodSchema.safeParse([1, { enabled: true }]).success).toBe(false);
  });

  it("should preserve exact object const values", () => {
    const schema = {
      const: {
        items: ["a", 2],
        nested: { ok: false },
      },
    } as unknown as SchemaObject;
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.strictObject({"items": z.tuple([z.literal("a"), z.literal(2)]), "nested": z.strictObject({"ok": z.literal(false)})})',
    );

    const zodSchema = evalZod(result.code);
    expect(
      zodSchema.safeParse({
        items: ["a", 2],
        nested: { ok: false },
      }).success,
    ).toBe(true);
    expect(
      zodSchema.safeParse({
        extra: true,
        items: ["a", 2],
        nested: { ok: false },
      }).success,
    ).toBe(false);
    expect(
      zodSchema.safeParse({
        items: ["a", 3],
        nested: { ok: false },
      }).success,
    ).toBe(false);
  });

  it("should generate z.literal(false) for const: false", () => {
    const schema: SchemaObject = { const: false };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.literal(false)");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(false).success).toBe(true);
    expect(zodSchema.safeParse(true).success).toBe(false);
  });

  it("should generate z.literal(0) for const: 0", () => {
    const schema: SchemaObject = { const: 0 };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.literal(0)");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(0).success).toBe(true);
    expect(zodSchema.safeParse(1).success).toBe(false);
  });

  it('should generate z.literal("") for const: empty string', () => {
    const schema: SchemaObject = { const: "" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.literal("")');

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("").success).toBe(true);
    expect(zodSchema.safeParse("x").success).toBe(false);
  });

  it("should preserve non-primitive enum members without widening", () => {
    const schema = {
      enum: [[1, 2], { kind: "ok", meta: { version: 1 } }, "fallback"],
    } as unknown as SchemaObject;
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.union([z.tuple([z.literal(1), z.literal(2)]), z.strictObject({"kind": z.literal("ok"), "meta": z.strictObject({"version": z.literal(1)})}), z.literal("fallback")])',
    );

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse([1, 2]).success).toBe(true);
    expect(
      zodSchema.safeParse({ kind: "ok", meta: { version: 1 } }).success,
    ).toBe(true);
    expect(zodSchema.safeParse("fallback").success).toBe(true);
    expect(zodSchema.safeParse([1, 3]).success).toBe(false);
    expect(zodSchema.safeParse({ kind: "ok" }).success).toBe(false);
    expect(zodSchema.safeParse({ anything: "goes" }).success).toBe(false);
  });
});
