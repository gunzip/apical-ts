import { describe, it, expect } from "vitest";
import { zodSchemaToCode } from "../src/schema-generator";
import { SchemaObject } from "openapi3-ts/oas31";

// Helper to eval generated code
function evalZod(code: string) {
  // eslint-disable-next-line no-new-func
  return new Function("z", `return ${code}`)(require("zod"));
}

describe("zodSchemaToCode", () => {
  it("should generate code for a simple string", () => {
    const schema: SchemaObject = { type: "string" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.string()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(123).success).toBe(false);
  });

  it("should handle local $ref references", () => {
    const refSchema = { $ref: "#/components/schemas/Profile" };
    const result = zodSchemaToCode(refSchema);
    expect(result.code).toBe("Profile");
    expect(result.imports.has("Profile")).toBe(true);
  });

  it("should handle allOf with $ref references", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/Profile" },
        {
          type: "object",
          properties: {
            status: { type: "string" },
          },
        },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("Profile");
    expect(result.code).toContain("intersection");
    expect(result.imports.has("Profile")).toBe(true);
  });
});
