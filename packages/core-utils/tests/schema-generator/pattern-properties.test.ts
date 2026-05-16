import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import { handleObjectType } from "../../src/schema-generator/object-types.js";
import {
  generatePatternPropertiesValueCode,
  generatePropertyNamesKeyCode,
  generateRecordCode,
  getPatternProperties,
} from "../../src/schema-generator/pattern-properties.js";
import { zodSchemaToCode } from "../../src/schema-generator/schema-converter.js";
import type { ZodSchemaResult } from "../../src/schema-generator/types.js";

describe("pattern-properties", () => {
  describe("getPatternProperties", () => {
    it("should return undefined when patternProperties is absent", () => {
      const schema: SchemaObject = { type: "object" };
      expect(getPatternProperties(schema)).toBeUndefined();
    });

    it("should return undefined for empty patternProperties", () => {
      const schema = { type: "object", patternProperties: {} } as SchemaObject;
      expect(getPatternProperties(schema)).toBeUndefined();
    });

    it("should return the patternProperties map when present", () => {
      const schema = {
        type: "object",
        patternProperties: { "^S_": { type: "string" } },
      } as SchemaObject;
      const result = getPatternProperties(schema);
      expect(result).toEqual({ "^S_": { type: "string" } });
    });
  });

  describe("generatePatternPropertiesValueCode", () => {
    it("should generate value code for a single pattern", () => {
      const patternProperties = { "^S_": { type: "string" } as SchemaObject };
      const result = generatePatternPropertiesValueCode(
        patternProperties,
        zodSchemaToCode,
      );
      expect(result.valueCode).toBe("z.string()");
      expect(result.keyCode).toBe("z.string().regex(/^S_/)");
    });

    it("should generate union for multiple patterns with refinement", () => {
      const patternProperties = {
        "^S_": { type: "string" } as SchemaObject,
        "^I_": { type: "integer" } as SchemaObject,
      };
      const result = generatePatternPropertiesValueCode(
        patternProperties,
        zodSchemaToCode,
      );
      expect(result.valueCode).toBe("z.union([z.string(), z.number().int()])");
      expect(result.keyCode).toBe("z.string()");
      expect(result.refinement).toBeDefined();
      expect(result.refinement).toContain("/^S_/.test(key)");
      expect(result.refinement).toContain("/^I_/.test(key)");
    });
  });

  describe("generatePropertyNamesKeyCode", () => {
    it("should generate z.enum for enumerable propertyNames", () => {
      const propertyNames: SchemaObject = {
        enum: ["foo", "bar", "baz"],
      };
      const result = generatePropertyNamesKeyCode(
        propertyNames,
        zodSchemaToCode,
      );
      expect(result.code).toBe('z.enum(["foo", "bar", "baz"])');
    });

    it("should generate regex for pattern propertyNames", () => {
      const propertyNames: SchemaObject = {
        pattern: "^[a-z]+$",
      };
      const result = generatePropertyNamesKeyCode(
        propertyNames,
        zodSchemaToCode,
      );
      expect(result.code).toBe("z.string().regex(/^[a-z]+$/)");
    });

    it("should generate z.string() for generic propertyNames", () => {
      const propertyNames: SchemaObject = { type: "string" };
      const result = generatePropertyNamesKeyCode(
        propertyNames,
        zodSchemaToCode,
      );
      expect(result.code).toBe("z.string()");
    });

    it("should handle propertyNames with slashes in pattern", () => {
      const propertyNames: SchemaObject = {
        pattern: "^/api/v[0-9]+",
      };
      const result = generatePropertyNamesKeyCode(
        propertyNames,
        zodSchemaToCode,
      );
      expect(result.code).toBe("z.string().regex(/^\\/api\\/v[0-9]+/)");
    });
  });

  describe("generateRecordCode", () => {
    it("should generate record with string key", () => {
      expect(
        generateRecordCode({ keyCode: "z.string()", valueCode: "z.number()" }),
      ).toBe("z.record(z.string(), z.number())");
    });

    it("should generate record with enum key", () => {
      expect(
        generateRecordCode({
          keyCode: 'z.enum(["a", "b"])',
          valueCode: "z.string()",
        }),
      ).toBe('z.record(z.enum(["a", "b"]), z.string())');
    });

    it("should append superRefine when refinement is provided", () => {
      const code = generateRecordCode({
        keyCode: "z.string()",
        refinement: "(val, ctx) => { /* check */ }",
        valueCode: "z.unknown()",
      });
      expect(code).toBe(
        "z.record(z.string(), z.unknown()).superRefine((val, ctx) => { /* check */ })",
      );
    });

    it("should not append superRefine when refinement is undefined", () => {
      const code = generateRecordCode({
        keyCode: "z.string()",
        refinement: undefined,
        valueCode: "z.string()",
      });
      expect(code).toBe("z.record(z.string(), z.string())");
    });
  });

  describe("handleObjectType integration", () => {
    it("should generate z.record for patternProperties without named properties", () => {
      const schema = {
        type: "object",
        patternProperties: { "^S_": { type: "string" } },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe("z.record(z.string().regex(/^S_/), z.string())");
    });

    it("should generate z.record with union and superRefine for multiple patterns", () => {
      const schema = {
        type: "object",
        patternProperties: {
          "^S_": { type: "string" },
          "^N_": { type: "number" },
        },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toContain(
        "z.record(z.string(), z.union([z.string(), z.number()]))",
      );
      expect(result.code).toContain(".superRefine(");
      expect(result.code).toContain("/^S_/.test(key)");
      expect(result.code).toContain("/^N_/.test(key)");
    });

    it("should generate z.record with enum key from propertyNames", () => {
      const schema: SchemaObject = {
        type: "object",
        propertyNames: { enum: ["alpha", "beta"] },
      };

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe(
        'z.record(z.enum(["alpha", "beta"]), z.unknown())',
      );
    });

    it("should generate z.record with both propertyNames and patternProperties", () => {
      const schema = {
        type: "object",
        patternProperties: { "^x-": { type: "string" } },
        propertyNames: { pattern: "^x-" },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe("z.record(z.string().regex(/^x-/), z.string())");
    });

    it("should use patternProperties value as catchall when named properties exist", () => {
      const schema = {
        type: "object",
        properties: { name: { type: "string" } },
        patternProperties: { "^x-": { type: "number" } },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe(
        'z.object({"name": z.string().optional()}).catchall(z.number())',
      );
    });

    it("should honour explicit additionalProperties over patternProperties", () => {
      const schema = {
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: false,
        patternProperties: { "^x-": { type: "number" } },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe(
        'z.strictObject({"name": z.string().optional()})',
      );
    });

    it("should honour additionalProperties: true over patternProperties", () => {
      const schema = {
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: true,
        patternProperties: { "^x-": { type: "number" } },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe(
        'z.object({"name": z.string().optional()}).catchall(z.unknown())',
      );
    });

    it("should generate z.record with additionalProperties schema when no patternProperties", () => {
      const schema: SchemaObject = {
        type: "object",
        propertyNames: { enum: ["a", "b", "c"] },
        additionalProperties: { type: "number" },
      };

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe('z.record(z.enum(["a", "b", "c"]), z.number())');
    });

    it("should still generate standard object for schemas without pattern keywords", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      };

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe('z.object({"id": z.string()})');
    });

    it("should handle patternProperties with required fields and named properties", () => {
      const schema = {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        patternProperties: { "^meta_": { type: "string" } },
      } as SchemaObject;

      const result: ZodSchemaResult = {
        code: "",
        helpers: new Set(),
        imports: new Set(),
      };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toBe(
        'z.object({"id": z.string()}).catchall(z.string())',
      );
    });
  });
});
