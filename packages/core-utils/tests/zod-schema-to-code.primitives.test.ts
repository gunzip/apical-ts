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

describe("zodSchemaToCode primitives", () => {
  it("should generate code for a simple string", () => {
    const schema: SchemaObject = { type: "string" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.string()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(123).success).toBe(false);
  });

  it("should generate code for a string with a pattern", () => {
    const schema: SchemaObject = { pattern: "^[a-z]+$", type: "string" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("regex");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("abc").success).toBe(true);
    expect(zodSchema.safeParse("ABC").success).toBe(false);
  });

  it("should generate code for an email", () => {
    const schema: SchemaObject = { format: "email", type: "string" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("email");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("test@example.com").success).toBe(true);
    expect(zodSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("should generate code for a simple number", () => {
    const schema: SchemaObject = { type: "number" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(123).success).toBe(true);
    expect(zodSchema.safeParse("hello").success).toBe(false);
  });

  it("should generate code for a number with min and max", () => {
    const schema: SchemaObject = { maximum: 20, minimum: 10, type: "number" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("min");
    expect(result.code).toContain("max");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(15).success).toBe(true);
    expect(zodSchema.safeParse(5).success).toBe(false);
    expect(zodSchema.safeParse(25).success).toBe(false);
  });

  it("should generate z.coerce.bigint() for integer with int64 format", () => {
    const schema: SchemaObject = { format: "int64", type: "integer" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.coerce.bigint()");
  });

  it("should generate z.number().int() for integer without format", () => {
    const schema: SchemaObject = { type: "integer" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().int()");
  });

  it("should generate z.number().int() for integer with int32 format", () => {
    const schema: SchemaObject = { format: "int32", type: "integer" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().int()");
  });

  it("should generate code for a simple boolean", () => {
    const schema: SchemaObject = { type: "boolean" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.boolean()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(true).success).toBe(true);
    expect(zodSchema.safeParse(false).success).toBe(true);
    expect(zodSchema.safeParse("true").success).toBe(false);
  });

  it("should generate z.null() for an explicit null type", () => {
    const schema: SchemaObject = { type: "null" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.null()");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(null).success).toBe(true);
    expect(zodSchema.safeParse("hello").success).toBe(false);
  });

  it("should preserve original ref names for lookup and sanitize identifiers for imports", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/data_center" },
        {
          properties: {
            status: { type: "string" },
          },
          type: "object",
        },
      ],
    };

    const resolvedSchemas = {
      data_center: {
        properties: {
          id: { type: "string" },
        },
        type: "object",
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("...dataCenter.shape");
    expect(result.imports.has("dataCenter")).toBe(true);
    expect(result.imports.has("data_center")).toBe(false);
  });
});
