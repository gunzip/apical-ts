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

describe("zodSchemaToCode descriptions", () => {
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
});
