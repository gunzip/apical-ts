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

function createExclusiveUnionForTests(
  schemas: [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
): z.ZodTypeAny {
  return z.union(schemas).superRefine((value, context) => {
    const matches = schemas.filter((schema) => schema.safeParse(value).success);
    if (matches.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Invalid input: Should pass exactly one schema",
      });
    }
  });
}

describe("zodSchemaToCode unions", () => {
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

  it("should use exclusiveUnion helper for oneOf when no discriminator is present", () => {
    const schema: SchemaObject = {
      oneOf: [{ type: "string" }, { type: "number" }],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("exclusiveUnion([z.string(), z.number()])");
    expect(result.helpers.has("exclusiveUnion")).toBe(true);
    expect(result.code).not.toContain("discriminatedUnion");
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

    // Test oneOf: should use exclusiveUnion helper for strict validation
    const oneOfSchema: SchemaObject = {
      oneOf: [normalUserSchema, adminUserSchema],
    };
    const oneOfResult = zodSchemaToCode(oneOfSchema);
    expect(oneOfResult.code).toContain("exclusiveUnion([");
    expect(oneOfResult.helpers.has("exclusiveUnion")).toBe(true);
    expect(oneOfResult.code).not.toContain("superRefine");
  });

  it("should not duplicate variant expressions in oneOf output", () => {
    const schema: SchemaObject = {
      oneOf: [
        {
          properties: {
            action: { enum: ["cache"], type: "string" },
            directive: { type: "string" },
            qualifiers: {
              items: { type: "string" },
              type: "array",
            },
          },
          required: ["action", "directive"],
          type: "object",
        },
        {
          properties: {
            action: { enum: ["rewrite"], type: "string" },
            headers: {
              items: { type: "string" },
              type: "array",
            },
          },
          required: ["action"],
          type: "object",
        },
      ],
    };
    const result = zodSchemaToCode(schema);

    /* Variant schemas appear exactly once as arguments to exclusiveUnion */
    expect(result.code).toMatch(/^exclusiveUnion\(\[/);
    expect(result.code).not.toContain("superRefine");
    expect(result.code).not.toContain("safeParse");

    /* Each variant object expression appears only once */
    const objectMatches = result.code.match(/z\.object\(/g);
    expect(objectMatches).toHaveLength(2);
  });

  it("should use exclusiveUnion for oneOf with $ref members", () => {
    const schema: SchemaObject = {
      oneOf: [
        { $ref: "#/components/schemas/PlacementInfoNoStatus" },
        { $ref: "#/components/schemas/PlacementInfo" },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      "exclusiveUnion([PlacementInfoNoStatus, PlacementInfo])",
    );
    expect(result.imports.has("PlacementInfoNoStatus")).toBe(true);
    expect(result.imports.has("PlacementInfo")).toBe(true);
  });

  it("should validate a nullable $ref member in oneOf", () => {
    const schema: SchemaObject = {
      oneOf: [{ $ref: "#/components/schemas/Qux" }, { type: "null" }],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("exclusiveUnion([Qux, z.null()])");

    const zodSchema = evalZod(result.code, {
      Qux: z.string(),
      exclusiveUnion: createExclusiveUnionForTests,
    });
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(null).success).toBe(true);
    expect(zodSchema.safeParse(42).success).toBe(false);
  });

  it("should validate a nullable $ref member in anyOf", () => {
    const schema: SchemaObject = {
      anyOf: [{ $ref: "#/components/schemas/Qux" }, { type: "null" }],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.union([Qux, z.null()])");

    const zodSchema = evalZod(result.code, { Qux: z.string() });
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(null).success).toBe(true);
    expect(zodSchema.safeParse(42).success).toBe(false);
  });

  it("should still use z.discriminatedUnion when a discriminator is declared and valid", () => {
    const schema: SchemaObject = {
      discriminator: { propertyName: "action" },
      oneOf: [
        {
          properties: {
            action: { const: "cache", type: "string" },
            directive: { type: "string" },
          },
          required: ["action"],
          type: "object",
        },
        {
          properties: {
            action: { const: "rewrite", type: "string" },
            headers: { items: { type: "string" }, type: "array" },
          },
          required: ["action"],
          type: "object",
        },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('z.discriminatedUnion("action"');
    expect(result.helpers.has("exclusiveUnion")).toBe(false);
    expect(result.code).not.toContain("exclusiveUnion");
    expect(result.code).not.toContain("superRefine");
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

  describe("default preservation on $ref, anyOf, and oneOf", () => {
    it("should preserve a primitive default on a $ref schema", () => {
      const schema = { $ref: "#/components/schemas/Status", default: "active" };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe('Status.default("active")');
      expect(result.imports.has("Status")).toBe(true);
    });

    it("should preserve an object default on a $ref schema", () => {
      const schema = {
        $ref: "#/components/schemas/Config",
        default: { enabled: true },
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe('Config.default({"enabled":true})');
      expect(result.imports.has("Config")).toBe(true);
    });

    it("should preserve a null default on a $ref schema", () => {
      const schema = { $ref: "#/components/schemas/Item", default: null };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe("Item.default(null)");
      expect(result.imports.has("Item")).toBe(true);
    });

    it("should coerce an int64 $ref default to bigint literal", () => {
      const schema = { $ref: "#/components/schemas/BigId", default: 42 };
      const result = zodSchemaToCode(schema, {
        resolvedSchemas: {
          BigId: { type: "integer", format: "int64" },
        },
      });
      expect(result.code).toBe("BigId.default(42n)");
      expect(result.imports.has("BigId")).toBe(true);
    });

    it("should preserve a primitive default on an anyOf schema", () => {
      const schema: SchemaObject = {
        anyOf: [{ type: "string" }, { type: "number" }],
        default: "hello",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe(
        'z.union([z.string(), z.number()]).default("hello")',
      );
    });

    it("should preserve a primitive default on a oneOf schema", () => {
      const schema: SchemaObject = {
        oneOf: [{ type: "string" }, { type: "number" }],
        default: 42,
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toContain(".default(42)");
      expect(result.code).toContain("exclusiveUnion([z.string(), z.number()])");
    });

    it("should preserve a null default on an anyOf schema", () => {
      const schema: SchemaObject = {
        anyOf: [{ type: "string" }, { type: "number" }],
        default: null,
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe(
        "z.union([z.string(), z.number()]).default(null)",
      );
    });

    it("should preserve an object default on an anyOf schema", () => {
      const schema: SchemaObject = {
        anyOf: [
          {
            type: "object",
            properties: { name: { type: "string" } },
          },
          { type: "string" },
        ],
        default: { name: "test" },
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toContain('.default({"name":"test"})');
    });

    it("should not apply .default() when no default is present on anyOf", () => {
      const schema: SchemaObject = {
        anyOf: [{ type: "string" }, { type: "number" }],
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe("z.union([z.string(), z.number()])");
      expect(result.code).not.toContain(".default(");
    });

    it("should not apply .default() when no default is present on $ref", () => {
      const schema = { $ref: "#/components/schemas/Foo" };
      const result = zodSchemaToCode(schema);
      expect(result.code).toBe("Foo");
      expect(result.code).not.toContain(".default(");
    });

    it("should not apply a primitive default on an allOf schema", () => {
      const schema: SchemaObject = {
        allOf: [
          { type: "object", properties: { id: { type: "string" } } },
          { type: "object", properties: { value: { type: "string" } } },
        ],
        default: "off",
      };
      const result = zodSchemaToCode(schema);
      expect(result.code).not.toContain(".default(");
    });
  });
});
