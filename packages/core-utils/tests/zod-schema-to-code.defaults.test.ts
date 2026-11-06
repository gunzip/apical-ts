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

describe("zodSchemaToCode defaults", () => {
  it("should apply null defaults after nullable wrapping", () => {
    const schema = {
      default: null,
      nullable: true as const,
      type: "number" as const,
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("(z.number()).nullable().default(null)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(undefined)).toBe(null);
    expect(zodSchema.parse(null)).toBe(null);
    expect(zodSchema.parse(5)).toBe(5);
  });

  it("should preserve boolean-array default coercion after nullable wrapping", () => {
    const schema = {
      default: ["true", "false"],
      items: { type: "boolean" as const },
      nullable: true as const,
      type: "array" as const,
    } as const;

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      "(z.array(z.boolean())).nullable().default([true,false])",
    );

    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(undefined)).toEqual([true, false]);
    expect(zodSchema.parse(null)).toBe(null);
  });

  it("should preserve bigint defaults after nullable wrapping", () => {
    const schema = {
      default: "42",
      format: "int64" as const,
      nullable: true as const,
      type: "integer" as const,
    } as const;

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("(z.coerce.bigint()).nullable().default(42n)");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(undefined)).toBe(42n);
    expect(zodSchema.parse(null)).toBe(null);
  });

  it("should preserve bigint defaults for nullable multi-type schemas", () => {
    const schema: SchemaObject = {
      default: "42",
      format: "int64",
      type: ["integer", "null"],
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("(z.coerce.bigint()).nullable().default(42n)");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(undefined)).toBe(42n);
    expect(zodSchema.parse(null)).toBe(null);
  });

  it("should handle default values for boolean schemas", () => {
    const schema: SchemaObject = {
      default: false,
      type: "boolean",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.boolean().default(false)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(true)).toBe(true);
    expect(zodSchema.parse(false)).toBe(false);
    expect(zodSchema.parse(undefined)).toBe(false); // default value
  });

  it("should handle default values for string schemas", () => {
    const schema: SchemaObject = {
      default: "hello world",
      type: "string",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.string().default("hello world")');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse("test")).toBe("test");
    expect(zodSchema.parse(undefined)).toBe("hello world"); // default value
  });

  it("should handle default values for number schemas", () => {
    const schema: SchemaObject = {
      default: 42,
      type: "number",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().default(42)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(100)).toBe(100);
    expect(zodSchema.parse(undefined)).toBe(42); // default value
  });

  it("should handle default values for integer schemas", () => {
    const schema: SchemaObject = {
      default: 10,
      type: "integer",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().int().default(10)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(5)).toBe(5);
    expect(zodSchema.parse(undefined)).toBe(10); // default value
  });

  it("should handle default values for int64 schemas", () => {
    const schema: SchemaObject = {
      default: 42,
      format: "int64",
      type: "integer",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.coerce.bigint().default(42n)");
  });

  it("should handle default values for array schemas", () => {
    const schema: SchemaObject = {
      default: ["default", "values"],
      items: { type: "string" },
      type: "array",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.array(z.string()).default(["default","values"])',
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(["test"])).toEqual(["test"]);
    expect(zodSchema.parse(undefined)).toEqual(["default", "values"]); // default value
  });

  it("should handle default values for object schemas", () => {
    const schema: SchemaObject = {
      default: { name: "default name" },
      properties: {
        name: { type: "string" },
      },
      type: "object",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.object({"name": z.string().optional()}).default({"name":"default name"})',
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse({ name: "test" })).toEqual({ name: "test" });
    expect(zodSchema.parse(undefined)).toEqual({ name: "default name" }); // default value
  });

  it("should handle default values with other constraints", () => {
    const schema: SchemaObject = {
      default: "hello",
      maxLength: 20,
      minLength: 5,
      type: "string",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.string().min(5).max(20).default("hello")');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse("test string")).toBe("test string");
    expect(zodSchema.parse(undefined)).toBe("hello"); // default value
  });

  it("should handle complex default values", () => {
    const schema: SchemaObject = {
      additionalProperties: {
        items: { type: "number" },
        type: "array",
      },
      default: { test: [1000] },
      type: "object",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.object({}).catchall(z.array(z.number())).default({"test":[1000]})',
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse({ other: [1, 2, 3] })).toEqual({
      other: [1, 2, 3],
    });
    expect(zodSchema.parse(undefined)).toEqual({ test: [1000] }); // default value
  });

  it("should handle x-extensible-enum with default value", () => {
    const schema: SchemaObject = {
      default: "en_US",
      type: "string",
      "x-extensible-enum": ["en_US", "es_ES", "fr_FR"],
    } as any;
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.enum(["en_US", "es_ES", "fr_FR"]).or(z.string()).default("en_US")',
    );
    const zodSchema = evalZod(result.code);

    expect(zodSchema.parse("es_ES")).toBe("es_ES");
    expect(zodSchema.parse("custom_LOCALE")).toBe("custom_LOCALE");
    expect(zodSchema.parse(undefined)).toBe("en_US"); // default value
  });

  it("should ignore enum defaults that are not valid enum members", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["PUBLISHED", "ARCHIVED", "DRAFT"],
      default: "",
    };

    const result = zodSchemaToCode(schema);

    expect(result.code).toBe('z.enum(["PUBLISHED", "ARCHIVED", "DRAFT"])');
  });

  it("should match non-primitive enum defaults structurally", () => {
    const schema = {
      default: { mode: "safe", retries: [1, 2] },
      enum: [
        { mode: "safe", retries: [1, 2] },
        { mode: "fast", retries: [] },
      ],
    } as unknown as SchemaObject;
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('.default({"mode":"safe","retries":[1,2]})');

    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(undefined)).toEqual({
      mode: "safe",
      retries: [1, 2],
    });
  });
});
