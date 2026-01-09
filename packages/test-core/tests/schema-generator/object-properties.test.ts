import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import {
  determineObjectMethod,
  generateObjectCode,
  type ObjectPropertyOptions,
} from "@apical-ts/core-utils";

/* Mock zodSchemaToCode function for testing */
const mockZodSchemaToCode = (
  schema: any,
  _options?: ObjectPropertyOptions,
) => ({
  code: Array.isArray(schema.enum)
    ? `z.enum([${schema.enum.map((v: string) => `"${v}"`).join(", ")}])`
    : schema.type === "string"
      ? "z.string()"
      : schema.type === "number"
        ? "z.number()"
        : "z.unknown()",
  imports: new Set<string>(),
});

describe("object-properties", () => {
  describe("determineObjectMethod", () => {
    it("should return z.strictObject when additionalProperties is false", () => {
      const result = determineObjectMethod(false);
      expect(result).toBe("z.strictObject");
    });

    it("should return z.object when additionalProperties is true", () => {
      const result = determineObjectMethod(true);
      expect(result).toBe("z.object");
    });

    it("should return z.object when additionalProperties is undefined", () => {
      const result = determineObjectMethod(undefined);
      expect(result).toBe("z.object");
    });

    it("should return z.object when additionalProperties is a schema object", () => {
      const schemaObject: SchemaObject = { type: "string" };
      const result = determineObjectMethod(schemaObject);
      expect(result).toBe("z.object");
    });
  });

  describe("generateObjectCode with extraProps option", () => {
    const shape = ['"name": z.string()', '"age": z.number().optional()'];

    it("should generate object with .strict() when extraProps=strict and additionalProperties=undefined", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strict",
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).strict()',
      );
      expect(result.imports).toEqual(new Set());
    });

    it("should generate object with .loose() when extraProps=loose and additionalProperties=undefined", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "loose",
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).loose()',
      );
      expect(result.imports).toEqual(new Set());
    });

    it("should generate plain object when extraProps=strip and additionalProperties=undefined", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strip",
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()})',
      );
      expect(result.imports).toEqual(new Set());
    });

    it("should default to strip behavior when extraProps is not specified", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode);

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()})',
      );
      expect(result.imports).toEqual(new Set());
    });

    it("should ignore extraProps when additionalProperties is explicitly false", () => {
      const result = generateObjectCode(shape, false, mockZodSchemaToCode, {
        extraProps: "loose", // Should be ignored
      });

      expect(result.code).toBe(
        'z.strictObject({"name": z.string(), "age": z.number().optional()})',
      );
      expect(result.imports).toEqual(new Set());
    });

    it("should ignore extraProps and add catchall when additionalProperties is true", () => {
      const result = generateObjectCode(shape, true, mockZodSchemaToCode, {
        extraProps: "strict", // Should be ignored
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).catchall(z.unknown())',
      );
      expect(result.imports).toEqual(new Set());
    });

    it("should ignore extraProps and use catchall when additionalProperties is a schema", () => {
      const additionalSchema: SchemaObject = { type: "string" };
      const result = generateObjectCode(
        shape,
        additionalSchema,
        mockZodSchemaToCode,
        {
          extraProps: "strict", // Should be ignored
        },
      );

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).catchall(z.string())',
      );
      expect(result.imports).toEqual(new Set());
    });
  });

  describe("generateObjectCode with empty objects", () => {
    it("should handle empty object with additionalProperties=undefined (special case overrides extraProps)", () => {
      /* Note: Current implementation has special case for empty objects with undefined additionalProperties
       * that overrides extraProps setting and always adds .catchall(z.unknown()) */
      const strictResult = generateObjectCode(
        [],
        undefined,
        mockZodSchemaToCode,
        {
          extraProps: "strict",
        },
      );
      expect(strictResult.code).toBe("z.object({}).catchall(z.unknown())");

      const looseResult = generateObjectCode(
        [],
        undefined,
        mockZodSchemaToCode,
        {
          extraProps: "loose",
        },
      );
      expect(looseResult.code).toBe("z.object({}).catchall(z.unknown())");

      const stripResult = generateObjectCode(
        [],
        undefined,
        mockZodSchemaToCode,
        {
          extraProps: "strip",
        },
      );
      expect(stripResult.code).toBe("z.object({}).catchall(z.unknown())");
    });

    it("should handle empty object with additionalProperties=true", () => {
      const result = generateObjectCode([], true, mockZodSchemaToCode, {
        extraProps: "strict", // Should be ignored
      });

      expect(result.code).toBe("z.object({}).catchall(z.unknown())");
    });

    it("should handle empty object with additionalProperties=false", () => {
      const result = generateObjectCode([], false, mockZodSchemaToCode, {
        extraProps: "loose", // Should be ignored
      });

      expect(result.code).toBe("z.strictObject({})");
    });
  });

  describe("generateObjectCode with complex additional property schemas", () => {
    it("should handle enum schema as additionalProperties", () => {
      const enumSchema: SchemaObject = {
        type: "string",
        enum: ["option1", "option2", "option3"],
      };
      const shape = ['"name": z.string()'];

      const result = generateObjectCode(
        shape,
        enumSchema,
        mockZodSchemaToCode,
        {
          extraProps: "strict", // Should be ignored
        },
      );

      expect(result.code).toBe(
        'z.object({"name": z.string()}).catchall(z.enum(["option1", "option2", "option3"]))',
      );
    });

    it("should handle object schema as additionalProperties", () => {
      const objectSchema: SchemaObject = {
        type: "object",
        properties: {
          nested: { type: "string" },
        },
      };
      const shape = ['"name": z.string()'];

      const result = generateObjectCode(
        shape,
        objectSchema,
        mockZodSchemaToCode,
        {
          extraProps: "loose", // Should be ignored
        },
      );

      expect(result.code).toBe(
        'z.object({"name": z.string()}).catchall(z.unknown())',
      );
    });
  });

  describe("generateObjectCode with formatting options", () => {
    const shape = ['"name": z.string()', '"age": z.number().optional()'];

    it("should format shape when formatShape=true", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strict",
        formatShape: true,
      });

      expect(result.code).toBe(`z.object({
  "name": z.string(),
  "age": z.number().optional()
}).strict()`);
    });

    it("should not format shape when formatShape=false", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strict",
        formatShape: false,
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).strict()',
      );
    });

    it("should default to inline formatting when formatShape is not specified", () => {
      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "loose",
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).loose()',
      );
    });
  });

  describe("generateObjectCode with imports", () => {
    it("should preserve existing imports", () => {
      const existingImports = new Set(["User", "Role"]);
      const shape = ['"name": z.string()'];

      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strict",
        imports: existingImports,
      });

      expect(result.imports).toEqual(existingImports);
    });

    it("should merge imports from additional schema", () => {
      const existingImports = new Set(["User"]);
      const shape = ['"name": z.string()'];
      const additionalSchema: SchemaObject = { type: "string" };

      /* Mock that returns new imports */
      const mockWithImports = (
        _schema: any,
        _options?: ObjectPropertyOptions,
      ) => ({
        code: "z.string()",
        imports: new Set(["AdditionalType"]),
      });

      const result = generateObjectCode(
        shape,
        additionalSchema,
        mockWithImports,
        {
          extraProps: "strip",
          imports: existingImports,
        },
      );

      expect(result.imports).toEqual(new Set(["User", "AdditionalType"]));
    });
  });

  describe("real-world scenarios based on test.yaml fixture", () => {
    it("should handle ObjectWithoutAdditionalProperties with extraProps=strict", () => {
      const shape = ['"name": z.string()', '"age": z.number().optional()'];

      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strict",
      });

      expect(result.code).toBe(
        'z.object({"name": z.string(), "age": z.number().optional()}).strict()',
      );
    });

    it("should handle ObjectWithAdditionalPropertiesTrue with extraProps=strict", () => {
      const shape = ['"name": z.string()'];

      const result = generateObjectCode(shape, true, mockZodSchemaToCode, {
        extraProps: "strict", // Should be ignored
      });

      expect(result.code).toBe(
        'z.object({"name": z.string()}).catchall(z.unknown())',
      );
    });

    it("should handle ObjectWithAdditionalPropertiesFalse with extraProps=loose", () => {
      const shape = ['"name": z.string()'];

      const result = generateObjectCode(shape, false, mockZodSchemaToCode, {
        extraProps: "loose", // Should be ignored
      });

      expect(result.code).toBe('z.strictObject({"name": z.string()})');
    });

    it("should handle ObjectWithAdditionalPropertiesSchema with extraProps=strict", () => {
      const shape = ['"name": z.string()'];
      const additionalSchema: SchemaObject = { type: "string" };

      const result = generateObjectCode(
        shape,
        additionalSchema,
        mockZodSchemaToCode,
        {
          extraProps: "strict", // Should be ignored
        },
      );

      expect(result.code).toBe(
        'z.object({"name": z.string()}).catchall(z.string())',
      );
    });

    it("should handle EmptyObjectWithoutAdditionalProperties with different extraProps values", () => {
      /* Note: Current implementation treats empty objects with undefined additionalProperties
       * as a special case that overrides extraProps behavior */
      const strictResult = generateObjectCode(
        [],
        undefined,
        mockZodSchemaToCode,
        {
          extraProps: "strict",
        },
      );
      expect(strictResult.code).toBe("z.object({}).catchall(z.unknown())");

      const looseResult = generateObjectCode(
        [],
        undefined,
        mockZodSchemaToCode,
        {
          extraProps: "loose",
        },
      );
      expect(looseResult.code).toBe("z.object({}).catchall(z.unknown())");

      const stripResult = generateObjectCode(
        [],
        undefined,
        mockZodSchemaToCode,
        {
          extraProps: "strip",
        },
      );
      expect(stripResult.code).toBe("z.object({}).catchall(z.unknown())");
    });

    it("should handle EmptyObjectWithAdditionalPropertiesTrue with extraProps", () => {
      const result = generateObjectCode([], true, mockZodSchemaToCode, {
        extraProps: "strict", // Should be ignored
      });

      expect(result.code).toBe("z.object({}).catchall(z.unknown())");
    });
  });

  describe("edge cases", () => {
    it("should handle object with only optional properties", () => {
      const shape = ['"optionalField": z.string().optional()'];

      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "loose",
      });

      expect(result.code).toBe(
        'z.object({"optionalField": z.string().optional()}).loose()',
      );
    });

    it("should handle object with special characters in property names", () => {
      const shape = [
        '"field-with-dash": z.string()',
        '"field_with_underscore": z.number()',
      ];

      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strict",
      });

      expect(result.code).toBe(
        'z.object({"field-with-dash": z.string(), "field_with_underscore": z.number()}).strict()',
      );
    });

    it("should handle large objects with many properties", () => {
      const shape = Array.from(
        { length: 10 },
        (_, i) => `"field${i}": z.string()`,
      );

      const result = generateObjectCode(shape, undefined, mockZodSchemaToCode, {
        extraProps: "strip",
      });

      const expectedShape = shape.join(", ");
      expect(result.code).toBe(`z.object({${expectedShape}})`);
    });
  });
});
