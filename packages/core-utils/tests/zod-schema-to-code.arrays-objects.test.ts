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

describe("zodSchemaToCode arrays-objects", () => {
  it("should generate code for a simple array", () => {
    const schema: SchemaObject = { items: { type: "string" }, type: "array" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("array");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
    expect(zodSchema.safeParse([1, 2, 3]).success).toBe(false);
  });

  it("should generate code for a simple object", () => {
    const schema: SchemaObject = {
      properties: {
        age: { type: "number" },
        name: { type: "string" },
      },
      type: "object",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("object");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ age: 30, name: "John" }).success).toBe(true);
    expect(zodSchema.safeParse({ age: "30", name: "John" }).success).toBe(
      false,
    );
  });

  it("should handle nullable properties", () => {
    const schema: SchemaObject = { type: ["string", "null"] };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("nullable");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(null).success).toBe(true);
    expect(zodSchema.safeParse(undefined).success).toBe(false);
  });
});
