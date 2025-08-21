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

  it("should generate code for a string with a pattern", () => {
    const schema: SchemaObject = { type: "string", pattern: "^[a-z]+$" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("regex");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("abc").success).toBe(true);
    expect(zodSchema.safeParse("ABC").success).toBe(false);
  });

  it("should generate code for an email", () => {
    const schema: SchemaObject = { type: "string", format: "email" };
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
    const schema: SchemaObject = { type: "number", minimum: 10, maximum: 20 };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("min");
    expect(result.code).toContain("max");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(15).success).toBe(true);
    expect(zodSchema.safeParse(5).success).toBe(false);
    expect(zodSchema.safeParse(25).success).toBe(false);
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

  it("should generate code for a simple array", () => {
    const schema: SchemaObject = { type: "array", items: { type: "string" } };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("array");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
    expect(zodSchema.safeParse([1, 2, 3]).success).toBe(false);
  });

  it("should generate code for a simple object", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("object");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
    expect(zodSchema.safeParse({ name: "John", age: "30" }).success).toBe(
      false
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

  it("should handle default values for boolean schemas", () => {
    const schema: SchemaObject = {
      type: "boolean",
      default: false,
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
      type: "string",
      default: "hello world",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.string().default("hello world")');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse("test")).toBe("test");
    expect(zodSchema.parse(undefined)).toBe("hello world"); // default value
  });

  it("should handle default values for number schemas", () => {
    const schema: SchemaObject = {
      type: "number",
      default: 42,
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().default(42)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(100)).toBe(100);
    expect(zodSchema.parse(undefined)).toBe(42); // default value
  });

  it("should handle default values for integer schemas", () => {
    const schema: SchemaObject = {
      type: "integer",
      default: 10,
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().int().default(10)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(5)).toBe(5);
    expect(zodSchema.parse(undefined)).toBe(10); // default value
  });

  it("should handle default values for array schemas", () => {
    const schema: SchemaObject = {
      type: "array",
      items: { type: "string" },
      default: ["default", "values"],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.array(z.string()).default(["default","values"])'
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(["test"])).toEqual(["test"]);
    expect(zodSchema.parse(undefined)).toEqual(["default", "values"]); // default value
  });

  it("should handle default values for object schemas", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      default: { name: "default name" },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.object({"name": z.string().optional()}).default({"name":"default name"})'
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse({ name: "test" })).toEqual({ name: "test" });
    expect(zodSchema.parse(undefined)).toEqual({ name: "default name" }); // default value
  });

  it("should handle default values with other constraints", () => {
    const schema: SchemaObject = {
      type: "string",
      minLength: 5,
      maxLength: 20,
      default: "hello",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.string().min(5).max(20).default("hello")');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse("test string")).toBe("test string");
    expect(zodSchema.parse(undefined)).toBe("hello"); // default value
  });

  it("should handle complex default values", () => {
    const schema: SchemaObject = {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { type: "number" },
      },
      default: { test: [1000] },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.object({}).catchall(z.array(z.number())).default({"test":[1000]})'
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse({ other: [1, 2, 3] })).toEqual({ other: [1, 2, 3] });
    expect(zodSchema.parse(undefined)).toEqual({ test: [1000] }); // default value
  });

  it("should handle discriminated unions with oneOf", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["circle"] },
            radius: { type: "number" },
          },
          required: ["type", "radius"],
        },
        {
          type: "object",
          properties: {
            type: { type: "string", enum: ["square"] },
            size: { type: "number" },
          },
          required: ["type", "size"],
        },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('z.discriminatedUnion("type"');
    expect(result.code).toContain("z.object");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ type: "circle", radius: 5 }).success).toBe(
      true
    );
    expect(zodSchema.safeParse({ type: "square", size: 10 }).success).toBe(
      true
    );
    expect(zodSchema.safeParse({ type: "triangle", height: 5 }).success).toBe(
      false
    );
  });

  it("should handle discriminated unions with anyOf", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "kind",
      },
      anyOf: [
        {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["user"] },
            name: { type: "string" },
          },
          required: ["kind", "name"],
        },
        {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["admin"] },
            permissions: { type: "array", items: { type: "string" } },
          },
          required: ["kind", "permissions"],
        },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('z.discriminatedUnion("kind"');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ kind: "user", name: "john" }).success).toBe(
      true
    );
    expect(
      zodSchema.safeParse({ kind: "admin", permissions: ["read", "write"] })
        .success
    ).toBe(true);
    expect(zodSchema.safeParse({ kind: "guest", id: 123 }).success).toBe(false);
  });

  it("should handle discriminated unions with $ref schemas", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        { $ref: "#/components/schemas/Circle" },
        { $ref: "#/components/schemas/Square" },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.discriminatedUnion("type", [Circle, Square])');
    expect(result.imports.has("Circle")).toBe(true);
    expect(result.imports.has("Square")).toBe(true);
  });

  it("should use superRefine for oneOf when no discriminator is present", () => {
    const schema: SchemaObject = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("z.any().superRefine(");
    expect(result.code).toContain("Should pass exactly one schema");
    expect(result.code).not.toContain("discriminatedUnion");
    // Note: Skip evalZod for complex superRefine code as it contains TypeScript types
    // The functionality is tested in integration tests
  });

  it("should handle anyOf vs oneOf differently for overlapping schemas", () => {
    // Schema for NormalUser (subset of AdminUser)
    const normalUserSchema = {
      type: "object" as const,
      properties: {
        id: { type: "integer" as const },
        name: { type: "string" as const },
      },
      required: ["id", "name"],
    };

    // Schema for AdminUser (superset of NormalUser)
    const adminUserSchema = {
      type: "object" as const,
      properties: {
        id: { type: "integer" as const },
        name: { type: "string" as const },
        secret: { type: "string" as const },
      },
      required: ["id", "name", "secret"],
    };

    // Test anyOf: should accept values that match any schema
    const anyOfSchema: SchemaObject = {
      anyOf: [normalUserSchema, adminUserSchema],
    };
    const anyOfResult = zodSchemaToCode(anyOfSchema);
    expect(anyOfResult.code).toContain("z.union([");

    // Test oneOf: should use superRefine for strict validation
    const oneOfSchema: SchemaObject = {
      oneOf: [normalUserSchema, adminUserSchema],
    };
    const oneOfResult = zodSchemaToCode(oneOfSchema);
    expect(oneOfResult.code).toContain("z.any().superRefine(");
    expect(oneOfResult.code).toContain("Should pass exactly one schema");
  });

  it("should handle x-extensible-enum for strings", () => {
    const schema: SchemaObject = {
      type: "string",
      "x-extensible-enum": ["value1", "value2", "value3"],
    } as any; // Cast to any to allow x-extensible-enum extension
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.enum(["value1", "value2", "value3"]).or(z.string())'
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

  it("should handle x-extensible-enum with default value", () => {
    const schema: SchemaObject = {
      type: "string",
      "x-extensible-enum": ["en_US", "es_ES", "fr_FR"],
      default: "en_US",
    } as any;
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.enum(["en_US", "es_ES", "fr_FR"]).or(z.string()).default("en_US")'
    );
    const zodSchema = evalZod(result.code);

    expect(zodSchema.parse("es_ES")).toBe("es_ES");
    expect(zodSchema.parse("custom_LOCALE")).toBe("custom_LOCALE");
    expect(zodSchema.parse(undefined)).toBe("en_US"); // default value
  });

  it("should prioritize x-extensible-enum over regular enum", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["regularEnum1", "regularEnum2"],
      "x-extensible-enum": ["extensibleValue1", "extensibleValue2"],
    } as any;
    const result = zodSchemaToCode(schema);
    // Should use x-extensible-enum and generate extensible schema
    expect(result.code).toBe(
      'z.enum(["extensibleValue1", "extensibleValue2"]).or(z.string())'
    );
    expect(result.code).not.toContain("regularEnum1");
  });
});
