/*
 * Unit tests for Zod to ArkType converter
 */

import { describe, expect, it } from "vitest";
import { convertZodToArkType } from "../src/converter.js";

describe("convertZodToArkType", () => {
  describe("primitive types", () => {
    it('should convert z.string() to type("string")', () => {
      const result = convertZodToArkType("z.string()", "TestSchema");
      expect(result.code).toBe('type("string")');
      expect(result.schemaName).toBe("TestSchema");
    });

    it('should convert z.number() to type("number")', () => {
      const result = convertZodToArkType("z.number()", "TestSchema");
      expect(result.code).toBe('type("number")');
    });

    it('should convert z.boolean() to type("boolean")', () => {
      const result = convertZodToArkType("z.boolean()", "TestSchema");
      expect(result.code).toBe('type("boolean")');
    });

    it('should convert z.unknown() to type("unknown")', () => {
      const result = convertZodToArkType("z.unknown()", "TestSchema");
      expect(result.code).toBe('type("unknown")');
    });

    it('should convert z.any() to type("unknown")', () => {
      const result = convertZodToArkType("z.any()", "TestSchema");
      expect(result.code).toBe('type("unknown")');
    });

    it('should convert z.null() to type("null")', () => {
      const result = convertZodToArkType("z.null()", "TestSchema");
      expect(result.code).toBe('type("null")');
    });

    it('should convert z.undefined() to type("undefined")', () => {
      const result = convertZodToArkType("z.undefined()", "TestSchema");
      expect(result.code).toBe('type("undefined")');
    });
  });

  describe("string modifiers", () => {
    it('should convert z.string().optional() to type("string") | undefined', () => {
      const result = convertZodToArkType("z.string().optional()", "TestSchema");
      expect(result.code).toBe('(type("string")).or(type("undefined"))');
    });

    it('should convert z.string().email() to type("string.email")', () => {
      const result = convertZodToArkType("z.string().email()", "TestSchema");
      expect(result.code).toBe('type("string.email")');
    });

    it('should convert z.string().url() to type("string.url")', () => {
      const result = convertZodToArkType("z.string().url()", "TestSchema");
      expect(result.code).toBe('type("string.url")');
    });

    it('should convert z.string().uuid() to type("string.uuid")', () => {
      const result = convertZodToArkType("z.string().uuid()", "TestSchema");
      expect(result.code).toBe('type("string.uuid")');
    });
  });

  describe("number modifiers", () => {
    it('should convert z.number().optional() to type("number") | undefined', () => {
      const result = convertZodToArkType("z.number().optional()", "TestSchema");
      expect(result.code).toBe('(type("number")).or(type("undefined"))');
    });

    it('should convert z.number().int() to type("number.integer")', () => {
      const result = convertZodToArkType("z.number().int()", "TestSchema");
      expect(result.code).toBe('type("number.integer")');
    });
  });

  describe("arrays", () => {
    it('should convert z.array(z.string()) to (type("string")).array()', () => {
      const result = convertZodToArkType("z.array(z.string())", "TestSchema");
      expect(result.code).toBe('(type("string")).array()');
    });

    it('should convert z.array(z.number()) to (type("number")).array()', () => {
      const result = convertZodToArkType("z.array(z.number())", "TestSchema");
      expect(result.code).toBe('(type("number")).array()');
    });

    it("should convert z.array(SchemaRef) to (SchemaRef).array()", () => {
      const result = convertZodToArkType("z.array(Message)", "TestSchema");
      expect(result.code).toBe("(Message).array()");
    });
  });

  describe("objects", () => {
    it("should convert simple object", () => {
      const zodCode = 'z.object({"id": z.string()})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe('type({id: "string"})');
    });

    it("should convert object with multiple properties", () => {
      const zodCode = 'z.object({"id": z.string(), "age": z.number()})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe('type({id: "string", age: "number"})');
    });

    it("should convert object with optional properties", () => {
      const zodCode =
        'z.object({"id": z.string(), "name": z.string().optional()})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe('type({id: "string", "name?": "string"})');
    });

    it("should convert object with schema references", () => {
      const zodCode = 'z.object({"prop1": SimpleDefinition})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("type({prop1: SimpleDefinition})");
    });
  });

  describe("allOf / intersections", () => {
    it("should convert allOf with spread shapes to intersection", () => {
      const zodCode =
        "z.object({...PaginationResponse.shape, ...NewModel.shape})";
      const result = convertZodToArkType(zodCode, "TestSchema");
      /* Should handle allOf pattern via .and() */
      expect(result.code).toContain(".and(");
    });

    it("should convert single shape spread to schema reference", () => {
      const zodCode = "z.object({...SimpleDefinition.shape})";
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("SimpleDefinition");
    });
  });

  describe("unions", () => {
    it("should convert z.union() to a chain of .or()", () => {
      const zodCode = "z.union([EnabledUserTest, DisabledUserTest])";
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("(EnabledUserTest).or(DisabledUserTest)");
    });

    it("should convert discriminated union", () => {
      const zodCode = 'z.discriminatedUnion("type", [SchemaA, SchemaB])';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("(SchemaA).or(SchemaB)");
    });
  });

  describe("literals and enums", () => {
    it("should convert z.literal() to type.enumerated()", () => {
      const result = convertZodToArkType('z.literal("active")', "TestSchema");
      expect(result.code).toBe('type.enumerated("active")');
    });

    it("should convert z.enum() to type.enumerated()", () => {
      const result = convertZodToArkType(
        'z.enum(["pending", "active", "closed"])',
        "TestSchema",
      );
      expect(result.code).toBe(
        'type.enumerated("pending", "active", "closed")',
      );
    });
  });

  describe("import extraction", () => {
    it("should extract imports from schema code", () => {
      const zodCode = `import { z } from 'zod';
import { Message } from "./Message.js";

z.object({"items": z.array(Message)})`;

      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.imports.has("Message")).toBe(true);
    });

    it("should extract multiple imports", () => {
      const zodCode = `import { z } from 'zod';
import { Message } from "./Message.js";
import { PaginationResponse } from "./PaginationResponse.js";

z.object({})`;

      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.imports.has("Message")).toBe(true);
      expect(result.imports.has("PaginationResponse")).toBe(true);
    });
  });

  describe("schema references", () => {
    it("should preserve schema references", () => {
      const result = convertZodToArkType("SimpleDefinition", "TestSchema");
      expect(result.code).toBe("SimpleDefinition");
    });
  });

  describe("error handling", () => {
    it("should handle empty input", () => {
      const result = convertZodToArkType("", "TestSchema");
      /* Empty input should return type("unknown") */
      expect(result.code).toBe('type("unknown")');
    });
  });
});
