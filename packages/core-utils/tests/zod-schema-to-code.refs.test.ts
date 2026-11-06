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

describe("zodSchemaToCode refs", () => {
  it("should handle local $ref references", () => {
    const refSchema = { $ref: "#/components/schemas/Profile" };
    const result = zodSchemaToCode(refSchema);
    expect(result.code).toBe("Profile");
    expect(result.imports.has("Profile")).toBe(true);
  });

  it("should fall back to z.unknown() for external $ref references", () => {
    const refSchema = {
      $ref: "./schemas/profile.yaml#/components/schemas/Profile",
    };
    const result = zodSchemaToCode(refSchema);
    expect(result.code).toBe("z.unknown()");
    expect(result.imports.size).toBe(0);
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

  it("should validate the issue's object with a nullable $ref member", () => {
    const schema: SchemaObject = {
      properties: {
        bar: { type: "string" },
        baz: { type: ["string", "null"] },
        qux: {
          oneOf: [{ $ref: "#/components/schemas/Qux" }, { type: "null" }],
        },
      },
      required: ["bar", "baz", "qux"],
      type: "object",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain('"qux": exclusiveUnion([Qux, z.null()])');

    const zodSchema = evalZod(result.code, {
      Qux: z.string(),
      exclusiveUnion: createExclusiveUnionForTests,
    });
    expect(
      zodSchema.safeParse({ bar: "a", baz: null, qux: "hello" }).success,
    ).toBe(true);
    expect(
      zodSchema.safeParse({ bar: "a", baz: null, qux: null }).success,
    ).toBe(true);
    expect(zodSchema.safeParse({ bar: "a", baz: null, qux: 42 }).success).toBe(
      false,
    );
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

    it("should fall back to z.union when a mapped ref resolves to a non-object schema", () => {
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
          type: "string" as const,
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
      expect(result.code).toBe("z.union([AdminUser, RegularUser])");
    });

    it("should fall back to z.union when a mapped ref lacks the discriminator property", () => {
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
          },
          required: ["permissions"],
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
      expect(result.code).toBe("z.union([AdminUser, RegularUser])");
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
      expect(result.code).toBe(
        'z.discriminatedUnion("type", [Circle, Square])',
      );
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
