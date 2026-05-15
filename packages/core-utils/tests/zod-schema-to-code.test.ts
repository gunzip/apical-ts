import { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import { zodSchemaToCode } from "../src/schema-generator/index.js";

// Helper to eval generated code
function evalZod(code: string) {
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
          properties: {
            status: { type: "string" },
          },
          type: "object",
        },
      ],
    };

    // Mock resolved schemas registry
    const resolvedSchemas = {
      Profile: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("Profile");
    expect(result.code).toContain("z.object({...Profile.shape");
    expect(result.imports.has("Profile")).toBe(true);
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

  it("should fallback to intersection for allOf with non-object $ref references", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/UserId" }, // This references a string, not an object
        {
          properties: {
            status: { type: "string" },
          },
          type: "object",
        },
      ],
    };

    // Mock resolved schemas registry with a non-object reference
    const resolvedSchemas = {
      UserId: {
        type: "string",
        pattern: "^[a-zA-Z0-9]+$",
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("UserId");
    expect(result.code).toContain("z.intersection(");
    expect(result.imports.has("UserId")).toBe(true);
  });

  it("should use full z.intersection for allOf with enum $ref (no .shape)", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/BaseObject" },
        { $ref: "#/components/schemas/ActionEnum" },
      ],
    };

    const resolvedSchemas = {
      BaseObject: {
        type: "object",
        properties: { id: { type: "string" } },
      } as SchemaObject,
      ActionEnum: {
        enum: ["block", "challenge", "allow"],
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.intersection(");
    expect(result.code).toContain("BaseObject");
    expect(result.code).toContain("ActionEnum");
    expect(result.code).not.toContain(".shape");
    expect(result.imports.has("BaseObject")).toBe(true);
    expect(result.imports.has("ActionEnum")).toBe(true);
  });

  it("should use full z.intersection for allOf with oneOf $ref (no .shape)", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/BaseObject" },
        { $ref: "#/components/schemas/RecordUnion" },
      ],
    };

    const resolvedSchemas = {
      BaseObject: {
        type: "object",
        properties: { id: { type: "string" } },
      } as SchemaObject,
      RecordUnion: {
        oneOf: [
          { type: "object", properties: { a: { type: "string" } } },
          { type: "object", properties: { b: { type: "number" } } },
        ],
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.intersection(");
    expect(result.code).toContain("BaseObject");
    expect(result.code).toContain("RecordUnion");
    expect(result.code).not.toContain(".shape");
  });

  it("should use full z.intersection for allOf with anyOf $ref (no .shape)", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/BaseObject" },
        { $ref: "#/components/schemas/MixedUnion" },
      ],
    };

    const resolvedSchemas = {
      BaseObject: {
        type: "object",
        properties: { name: { type: "string" } },
      } as SchemaObject,
      MixedUnion: {
        anyOf: [{ type: "string" }, { type: "number" }],
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.intersection(");
    expect(result.code).toContain("BaseObject");
    expect(result.code).not.toContain(".shape");
  });

  it("should keep object-only nested allOf refs flattenable", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/BaseObject" },
        { $ref: "#/components/schemas/Composed" },
      ],
    };

    const resolvedSchemas = {
      BaseObject: {
        type: "object",
        properties: { id: { type: "string" } },
      } as SchemaObject,
      Composed: {
        allOf: [
          { type: "object", properties: { x: { type: "string" } } },
          { type: "object", properties: { y: { type: "number" } } },
        ],
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.object({...BaseObject.shape");
    expect(result.code).toContain("...Composed.shape");
    expect(result.code).not.toContain("z.intersection(");
    expect(result.imports.has("BaseObject")).toBe(true);
    expect(result.imports.has("Composed")).toBe(true);
  });

  it("should use full z.intersection for allOf with mixed nested allOf $ref", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/BaseObject" },
        { $ref: "#/components/schemas/MixedComposed" },
      ],
    };

    const resolvedSchemas = {
      BaseObject: {
        type: "object",
        properties: { id: { type: "string" } },
      } as SchemaObject,
      MixedComposed: {
        allOf: [
          { type: "object", properties: { x: { type: "string" } } },
          { type: "string" },
        ],
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.intersection(");
    expect(result.code).toContain("BaseObject");
    expect(result.code).toContain("MixedComposed");
    expect(result.code).not.toContain(".shape");
  });

  it("should use full z.intersection for allOf with const $ref (no .shape)", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/BaseObject" },
        { $ref: "#/components/schemas/ConstValue" },
      ],
    };

    const resolvedSchemas = {
      BaseObject: {
        type: "object",
        properties: { id: { type: "string" } },
      } as SchemaObject,
      ConstValue: {
        const: "fixed",
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.intersection(");
    expect(result.code).toContain("BaseObject");
    expect(result.code).toContain("ConstValue");
    expect(result.code).not.toContain(".shape");
    expect(result.imports.has("BaseObject")).toBe(true);
    expect(result.imports.has("ConstValue")).toBe(true);
  });

  it("should fallback to full intersection when all refs are non-objects", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/EnumA" },
        { $ref: "#/components/schemas/UnionB" },
      ],
    };

    const resolvedSchemas = {
      EnumA: {
        enum: ["x", "y"],
      } as SchemaObject,
      UnionB: {
        oneOf: [{ type: "string" }, { type: "number" }],
      } as SchemaObject,
    };

    const result = zodSchemaToCode(schema, { resolvedSchemas });
    expect(result.code).toContain("z.intersection(");
    expect(result.code).not.toContain(".shape");
    expect(result.imports.has("EnumA")).toBe(true);
    expect(result.imports.has("UnionB")).toBe(true);
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

  it("should handle discriminated unions with oneOf", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        {
          properties: {
            radius: { type: "number" },
            type: { enum: ["circle"], type: "string" },
          },
          required: ["type", "radius"],
          type: "object",
        },
        {
          properties: {
            size: { type: "number" },
            type: { enum: ["square"], type: "string" },
          },
          required: ["type", "size"],
          type: "object",
        },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('z.discriminatedUnion("type"');
    expect(result.code).toContain("z.object");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ radius: 5, type: "circle" }).success).toBe(
      true,
    );
    expect(zodSchema.safeParse({ size: 10, type: "square" }).success).toBe(
      true,
    );
    expect(zodSchema.safeParse({ height: 5, type: "triangle" }).success).toBe(
      false,
    );
  });

  it("should handle discriminated unions with anyOf", () => {
    const schema: SchemaObject = {
      anyOf: [
        {
          properties: {
            kind: { enum: ["user"], type: "string" },
            name: { type: "string" },
          },
          required: ["kind", "name"],
          type: "object",
        },
        {
          properties: {
            kind: { enum: ["admin"], type: "string" },
            permissions: { items: { type: "string" }, type: "array" },
          },
          required: ["kind", "permissions"],
          type: "object",
        },
      ],
      discriminator: {
        propertyName: "kind",
      },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('z.discriminatedUnion("kind"');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ kind: "user", name: "john" }).success).toBe(
      true,
    );
    expect(
      zodSchema.safeParse({ kind: "admin", permissions: ["read", "write"] })
        .success,
    ).toBe(true);
    expect(zodSchema.safeParse({ id: 123, kind: "guest" }).success).toBe(false);
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

  it("should hoist nullable $ref members in discriminated unions", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "kind",
      },
      oneOf: [
        { $ref: "#/components/schemas/Dog" },
        { $ref: "#/components/schemas/Cat" },
      ],
    };
    const result = zodSchemaToCode(schema, {
      resolvedSchemas: {
        Cat: {
          properties: {
            color: { type: "string" },
            kind: { enum: ["cat"], type: "string" },
          },
          required: ["kind"],
          type: ["object", "null"],
        },
        Dog: {
          description: "A dog",
          properties: {
            bark: { type: "boolean" },
            kind: { enum: ["dog"], type: "string" },
          },
          required: ["kind"],
          type: ["object", "null"],
        },
      },
    });

    expect(result.code).toBe(
      'z.discriminatedUnion("kind", [Dog.unwrap(), Cat.unwrap()]).nullable()',
    );
  });

  it("should fall back to z.union when only some discriminated union members are nullable", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        { $ref: "#/components/schemas/NullableMember" },
        { $ref: "#/components/schemas/NonNullableMember" },
      ],
    };
    const result = zodSchemaToCode(schema, {
      resolvedSchemas: {
        NonNullableMember: {
          properties: {
            type: { enum: ["b"], type: "string" },
          },
          required: ["type"],
          type: "object",
        },
        NullableMember: {
          properties: {
            type: { enum: ["a"], type: "string" },
          },
          required: ["type"],
          type: ["object", "null"],
        },
      },
    });

    expect(result.code).toBe("z.union([NullableMember, NonNullableMember])");
  });

  it("should fall back to plain z.union when a discriminated union contains an inline array member", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        {
          items: { type: "string" },
          type: "array",
        },
        {
          properties: {
            name: { type: "string" },
            type: { enum: ["file"], type: "string" },
          },
          required: ["type", "name"],
          type: "object",
        },
      ],
    };
    const result = zodSchemaToCode(schema);

    expect(result.code).toContain("z.union([");
    expect(result.code).not.toContain("discriminatedUnion");
    expect(result.code).not.toContain("superRefine");

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(["README.md"]).success).toBe(true);
    expect(
      zodSchema.safeParse({ name: "README.md", type: "file" }).success,
    ).toBe(true);
  });

  it("should keep using z.discriminatedUnion for resolved $ref members with discriminator tags", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        { $ref: "#/components/schemas/Circle" },
        { $ref: "#/components/schemas/Square" },
      ],
    };
    const result = zodSchemaToCode(schema, {
      resolvedSchemas: {
        Circle: {
          properties: {
            radius: { type: "number" },
            type: { enum: ["circle"], type: "string" },
          },
          required: ["type", "radius"],
          type: "object",
        },
        Square: {
          properties: {
            size: { type: "number" },
            type: { enum: ["square"], type: "string" },
          },
          required: ["type", "size"],
          type: "object",
        },
      },
    });

    expect(result.code).toBe('z.discriminatedUnion("type", [Circle, Square])');
  });

  it("should fall back to z.union when a referenced discriminated union member resolves to an array schema", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        { $ref: "#/components/schemas/ContentDirectory" },
        { $ref: "#/components/schemas/ContentFile" },
      ],
    };
    const result = zodSchemaToCode(schema, {
      resolvedSchemas: {
        ContentDirectory: {
          items: { type: "string" },
          type: "array",
        },
        ContentFile: {
          properties: {
            name: { type: "string" },
            type: { enum: ["file"], type: "string" },
          },
          required: ["type", "name"],
          type: "object",
        },
      },
    });

    expect(result.code).toBe("z.union([ContentDirectory, ContentFile])");
    expect(result.imports.has("ContentDirectory")).toBe(true);
    expect(result.imports.has("ContentFile")).toBe(true);
  });

  it("should keep inline nullable discriminated union members with descriptions discriminable", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "type",
      },
      oneOf: [
        {
          description: "A circle shape",
          properties: {
            radius: { type: "number" },
            type: { enum: ["circle"], type: "string" },
          },
          required: ["type", "radius"],
          type: ["object", "null"],
        },
        {
          description: "A square shape",
          properties: {
            size: { type: "number" },
            type: { enum: ["square"], type: "string" },
          },
          required: ["type", "size"],
          type: ["object", "null"],
        },
      ],
    };
    const result = zodSchemaToCode(schema);

    expect(result.code).toContain('z.discriminatedUnion("type"');
    expect(result.code).toContain(".nullable()");
    expect(result.code).toContain('.describe("A circle shape")');
    expect(result.code).toContain('.describe("A square shape")');
    expect(result.code).not.toContain("z.union([");
  });

  it("should fall back to z.union for nullable $ref discriminated union members with defaults", () => {
    const schema: SchemaObject = {
      discriminator: {
        propertyName: "kind",
      },
      oneOf: [
        { $ref: "#/components/schemas/Dog" },
        { $ref: "#/components/schemas/Cat" },
      ],
    };
    const result = zodSchemaToCode(schema, {
      resolvedSchemas: {
        Cat: {
          default: { kind: "cat" },
          properties: {
            kind: { enum: ["cat"], type: "string" },
          },
          required: ["kind"],
          type: ["object", "null"],
        },
        Dog: {
          default: { kind: "dog" },
          properties: {
            kind: { enum: ["dog"], type: "string" },
          },
          required: ["kind"],
          type: ["object", "null"],
        },
      },
    });

    expect(result.code).toBe("z.union([Dog, Cat])");
  });

  it("should use superRefine for oneOf when no discriminator is present", () => {
    const schema: SchemaObject = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain(
      "z.union([z.string(), z.number()]).superRefine(",
    );
    expect(result.code).toContain("Should pass exactly one schema");
    expect(result.code).not.toContain("discriminatedUnion");
    // Note: Skip evalZod for complex superRefine code as it contains TypeScript types
    // The functionality is tested in integration tests
  });

  it("should handle anyOf vs oneOf differently for overlapping schemas", () => {
    // Schema for NormalUser (subset of AdminUser)
    const normalUserSchema = {
      properties: {
        id: { type: "integer" as const },
        name: { type: "string" as const },
      },
      required: ["id", "name"],
      type: "object" as const,
    };

    // Schema for AdminUser (superset of NormalUser)
    const adminUserSchema = {
      properties: {
        id: { type: "integer" as const },
        name: { type: "string" as const },
        secret: { type: "string" as const },
      },
      required: ["id", "name", "secret"],
      type: "object" as const,
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
    expect(oneOfResult.code).toContain("z.union([");
    expect(oneOfResult.code).toContain("]).superRefine(");
    expect(oneOfResult.code).toContain("Should pass exactly one schema");
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

  // Tests for const field support
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

  // Tests for improved enum handling
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

  it("should ignore enum defaults that are not valid enum members", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["PUBLISHED", "ARCHIVED", "DRAFT"],
      default: "",
    };

    const result = zodSchemaToCode(schema);

    expect(result.code).toBe('z.enum(["PUBLISHED", "ARCHIVED", "DRAFT"])');
  });

  it("should use z.union for mixed enum types", () => {
    const schema: SchemaObject = {
      enum: ["string", 42, true],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.union([z.literal("string"), z.literal(42), z.literal(true)])',
    );

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("string").success).toBe(true);
    expect(zodSchema.safeParse(42).success).toBe(true);
    expect(zodSchema.safeParse(true).success).toBe(true);
    expect(zodSchema.safeParse("other").success).toBe(false);
  });

  it("should use z.union for numeric-only enums", () => {
    const schema: SchemaObject = {
      type: "number",
      enum: [1, 2, 3],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      "z.union([z.literal(1), z.literal(2), z.literal(3)])",
    );

    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(1).success).toBe(true);
    expect(zodSchema.safeParse(4).success).toBe(false);
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

  describe("description handling", () => {
    it("should add .describe() for string schema with description", () => {
      const schema: SchemaObject = {
        type: "string",
        description: "A user's full name",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe('z.string().describe("A user\'s full name")');
      const zodSchema = evalZod(result.code);
      expect(zodSchema.description).toBe("A user's full name");
    });

    it("should add .describe() for object schema with description", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          name: { type: "string", description: "The name" },
        },
        description: "A user profile",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toContain('.describe("A user profile")');
      expect(result.code).toContain('.describe("The name")');
      const zodSchema = evalZod(result.code);
      expect(zodSchema.description).toBe("A user profile");
      expect(zodSchema.shape.name.description).toBe("The name");
    });

    it("should add .describe() for nullable schema with description only once", () => {
      const schema: SchemaObject = {
        type: ["string", "null"],
        description: "Optional nickname",
      };
      const result = zodSchemaToCode(schema);
      // Should be (z.string()).nullable().describe(...) and NOT (z.string().describe(...)).nullable().describe(...)
      expect(result.code).toBe(
        '(z.string()).nullable().describe("Optional nickname")',
      );
      const zodSchema = evalZod(result.code);
      expect(zodSchema.description).toBe("Optional nickname");
    });

    it("should properly escape special characters in description", () => {
      const schema: SchemaObject = {
        type: "string",
        description: 'Description with "quotes" and\nnewlines',
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe(
        'z.string().describe("Description with \\"quotes\\" and\\nnewlines")',
      );
      const zodSchema = evalZod(result.code);
      expect(zodSchema.description).toBe(
        'Description with "quotes" and\nnewlines',
      );
    });
  });

  describe("discriminator mapping, allOf inheritance, and multi-file refs", () => {
    it("should use discriminator mapping keys as discriminator literals for $ref members", () => {
      const schema: SchemaObject = {
        discriminator: {
          mapping: {
            dog: "#/components/schemas/DogSchema",
            cat: "#/components/schemas/CatSchema",
          },
          propertyName: "petType",
        },
        oneOf: [
          { $ref: "#/components/schemas/DogSchema" },
          { $ref: "#/components/schemas/CatSchema" },
        ],
      };

      const resolvedSchemas = {
        CatSchema: {
          properties: {
            indoor: { type: "boolean" as const },
            petType: { const: "cat" },
          },
          required: ["petType", "indoor"],
          type: "object" as const,
        },
        DogSchema: {
          properties: {
            breed: { type: "string" as const },
            petType: { const: "dog" },
          },
          required: ["petType", "breed"],
          type: "object" as const,
        },
      };

      const result = zodSchemaToCode(schema, { resolvedSchemas });
      expect(result.code).toBe(
        'z.discriminatedUnion("petType", [DogSchema, CatSchema])',
      );
      expect(result.imports.has("DogSchema")).toBe(true);
      expect(result.imports.has("CatSchema")).toBe(true);
    });

    it("should handle discriminator mapping with multi-file refs", () => {
      const schema: SchemaObject = {
        discriminator: {
          mapping: {
            circle: "./shapes.yaml#/components/schemas/Circle",
            square: "./shapes.yaml#/components/schemas/Square",
          },
          propertyName: "shape",
        },
        oneOf: [
          { $ref: "#/components/schemas/Circle" },
          { $ref: "#/components/schemas/Square" },
        ],
      };

      const resolvedSchemas = {
        Circle: {
          properties: {
            radius: { type: "number" as const },
            shape: { const: "circle" },
          },
          required: ["shape", "radius"],
          type: "object" as const,
        },
        Square: {
          properties: {
            shape: { const: "square" },
            side: { type: "number" as const },
          },
          required: ["shape", "side"],
          type: "object" as const,
        },
      };

      const result = zodSchemaToCode(schema, { resolvedSchemas });
      expect(result.code).toBe(
        'z.discriminatedUnion("shape", [Circle, Square])',
      );
    });

    it("should handle allOf inheritance with discriminator keeping the most specific value", () => {
      const schema: SchemaObject = {
        discriminator: {
          propertyName: "type",
        },
        oneOf: [
          {
            allOf: [
              { $ref: "#/components/schemas/BaseShape" },
              {
                properties: {
                  radius: { type: "number" as const },
                  type: { const: "circle" },
                },
                required: ["type", "radius"],
                type: "object" as const,
              },
            ],
          },
          {
            allOf: [
              { $ref: "#/components/schemas/BaseShape" },
              {
                properties: {
                  side: { type: "number" as const },
                  type: { const: "square" },
                },
                required: ["type", "side"],
                type: "object" as const,
              },
            ],
          },
        ],
      };

      const resolvedSchemas = {
        BaseShape: {
          properties: {
            color: { type: "string" as const },
          },
          type: "object" as const,
        },
      };

      const result = zodSchemaToCode(schema, { resolvedSchemas });
      expect(result.code).toContain('z.discriminatedUnion("type"');
      expect(result.code).not.toContain("z.union([");
    });

    it("should handle allOf inheritance where discriminator value is in base schema", () => {
      const schema: SchemaObject = {
        discriminator: {
          propertyName: "kind",
        },
        oneOf: [
          {
            allOf: [
              {
                properties: {
                  kind: { const: "premium" },
                },
                type: "object" as const,
              },
              {
                properties: {
                  discount: { type: "number" as const },
                },
                type: "object" as const,
              },
            ],
          },
          {
            allOf: [
              {
                properties: {
                  kind: { const: "standard" },
                },
                type: "object" as const,
              },
              {
                properties: {
                  limit: { type: "number" as const },
                },
                type: "object" as const,
              },
            ],
          },
        ],
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).toContain('z.discriminatedUnion("kind"');
      expect(result.code).not.toContain("z.union([");
    });

    it("should handle discriminator mapping where refs do not have explicit const/enum", () => {
      /*
       * When a mapping is present, the generator should trust the mapping
       * declaration and keep using z.discriminatedUnion even if the referenced
       * schemas lack an explicit const/enum for the discriminator property.
       */
      const schema: SchemaObject = {
        discriminator: {
          mapping: {
            admin: "#/components/schemas/AdminUser",
            regular: "#/components/schemas/RegularUser",
          },
          propertyName: "role",
        },
        oneOf: [
          { $ref: "#/components/schemas/AdminUser" },
          { $ref: "#/components/schemas/RegularUser" },
        ],
      };

      const resolvedSchemas = {
        AdminUser: {
          properties: {
            permissions: {
              items: { type: "string" as const },
              type: "array" as const,
            },
            role: { type: "string" as const },
          },
          required: ["role", "permissions"],
          type: "object" as const,
        },
        RegularUser: {
          properties: {
            name: { type: "string" as const },
            role: { type: "string" as const },
          },
          required: ["role", "name"],
          type: "object" as const,
        },
      };

      const result = zodSchemaToCode(schema, { resolvedSchemas });
      expect(result.code).toBe(
        'z.discriminatedUnion("role", [AdminUser, RegularUser])',
      );
    });

    it("should handle allOf inheritance with $ref discriminator members in mapping", () => {
      const schema: SchemaObject = {
        discriminator: {
          mapping: {
            cat: "#/components/schemas/Cat",
            dog: "#/components/schemas/Dog",
          },
          propertyName: "petType",
        },
        oneOf: [
          { $ref: "#/components/schemas/Dog" },
          { $ref: "#/components/schemas/Cat" },
        ],
      };

      const resolvedSchemas = {
        Cat: {
          allOf: [
            { $ref: "#/components/schemas/Pet" },
            {
              properties: {
                indoor: { type: "boolean" as const },
                petType: { const: "cat" },
              },
              type: "object" as const,
            },
          ],
        } as SchemaObject,
        Dog: {
          allOf: [
            { $ref: "#/components/schemas/Pet" },
            {
              properties: {
                breed: { type: "string" as const },
                petType: { const: "dog" },
              },
              type: "object" as const,
            },
          ],
        } as SchemaObject,
        Pet: {
          properties: {
            name: { type: "string" as const },
            petType: { type: "string" as const },
          },
          required: ["name", "petType"],
          type: "object" as const,
        },
      };

      const result = zodSchemaToCode(schema, { resolvedSchemas });
      expect(result.code).toBe('z.discriminatedUnion("petType", [Dog, Cat])');
    });

    it("should avoid infinite recursion for circular allOf refs", () => {
      const schema: SchemaObject = {
        discriminator: {
          propertyName: "type",
        },
        oneOf: [
          { $ref: "#/components/schemas/Circle" },
          { $ref: "#/components/schemas/Square" },
        ],
      };

      const resolvedSchemas = {
        Circle: {
          allOf: [
            {
              properties: {
                radius: { type: "number" as const },
                type: { const: "circle" },
              },
              required: ["type", "radius"],
              type: "object" as const,
            },
            { $ref: "#/components/schemas/Circle" },
          ],
        } as SchemaObject,
        Square: {
          properties: {
            side: { type: "number" as const },
            type: { const: "square" },
          },
          required: ["type", "side"],
          type: "object" as const,
        },
      };

      const result = zodSchemaToCode(schema, { resolvedSchemas });
      expect(result.code).toBe('z.discriminatedUnion("type", [Circle, Square])');
    });

    it("should fall back to z.union when allOf member is not object-like", () => {
      const schema: SchemaObject = {
        discriminator: {
          propertyName: "type",
        },
        oneOf: [
          {
            allOf: [
              { enum: ["a", "b", "c"] },
              {
                properties: {
                  type: { const: "first" },
                },
                type: "object" as const,
              },
            ],
          },
          {
            properties: {
              type: { const: "second" },
            },
            type: "object" as const,
          },
        ],
      };

      const result = zodSchemaToCode(schema);
      expect(result.code).not.toContain("discriminatedUnion");
    });
  });
});
