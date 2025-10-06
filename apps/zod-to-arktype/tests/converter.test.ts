/*
 * Unit tests for Zod to ArkType converter
 */

import { describe, expect, it } from "vitest";
import { convertZodToArkType } from "../src/converter.js";

describe("convertZodToArkType", () => {
  describe("primitive types", () => {
    it("should convert z.string() to type.string", () => {
      const result = convertZodToArkType("z.string()", "TestSchema");
      expect(result.code).toBe("type.string");
      expect(result.schemaName).toBe("TestSchema");
    });

    it("should convert z.number() to type.number", () => {
      const result = convertZodToArkType("z.number()", "TestSchema");
      expect(result.code).toBe("type.number");
    });

    it("should convert z.boolean() to type.boolean", () => {
      const result = convertZodToArkType("z.boolean()", "TestSchema");
      expect(result.code).toBe("type.boolean");
    });

    it("should convert z.unknown() to type.unknown", () => {
      const result = convertZodToArkType("z.unknown()", "TestSchema");
      expect(result.code).toBe("type.unknown");
    });

    it("should convert z.any() to type.any", () => {
      const result = convertZodToArkType("z.any()", "TestSchema");
      expect(result.code).toBe("type.any");
    });

    it("should convert z.null() to type.null", () => {
      const result = convertZodToArkType("z.null()", "TestSchema");
      expect(result.code).toBe("type.null");
    });

    it("should convert z.undefined() to type.undefined", () => {
      const result = convertZodToArkType("z.undefined()", "TestSchema");
      expect(result.code).toBe("type.undefined");
    });
  });

  describe("string modifiers", () => {
    it("should convert z.string().optional() to type.string.optional", () => {
      const result = convertZodToArkType("z.string().optional()", "TestSchema");
      expect(result.code).toBe("type.string.optional");
    });

    it("should convert z.string().email() to type.email", () => {
      const result = convertZodToArkType("z.string().email()", "TestSchema");
      expect(result.code).toBe("type.email");
    });

    it("should convert z.string().url() to type.url", () => {
      const result = convertZodToArkType("z.string().url()", "TestSchema");
      expect(result.code).toBe("type.url");
    });

    it("should convert z.string().uuid() to type.uuid", () => {
      const result = convertZodToArkType("z.string().uuid()", "TestSchema");
      expect(result.code).toBe("type.uuid");
    });
  });

  describe("number modifiers", () => {
    it("should convert z.number().optional() to type.number.optional", () => {
      const result = convertZodToArkType("z.number().optional()", "TestSchema");
      expect(result.code).toBe("type.number.optional");
    });

    it("should convert z.number().int() to type.integer", () => {
      const result = convertZodToArkType("z.number().int()", "TestSchema");
      expect(result.code).toBe("type.integer");
    });
  });

  describe("arrays", () => {
    it("should convert z.array(z.string()) to type.string[]", () => {
      const result = convertZodToArkType("z.array(z.string())", "TestSchema");
      expect(result.code).toBe("type.string[]");
    });

    it("should convert z.array(z.number()) to type.number[]", () => {
      const result = convertZodToArkType("z.array(z.number())", "TestSchema");
      expect(result.code).toBe("type.number[]");
    });

    it("should convert z.array(SchemaRef) to SchemaRef[]", () => {
      const result = convertZodToArkType("z.array(Message)", "TestSchema");
      expect(result.code).toBe("Message[]");
    });
  });

  describe("objects", () => {
    it("should convert simple object", () => {
      const zodCode = 'z.object({"id": z.string()})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("type.object({id: type.string})");
    });

    it("should convert object with multiple properties", () => {
      const zodCode = 'z.object({"id": z.string(), "age": z.number()})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe(
        "type.object({id: type.string, age: type.number})",
      );
    });

    it("should convert object with optional properties", () => {
      const zodCode =
        'z.object({"id": z.string(), "name": z.string().optional()})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe(
        "type.object({id: type.string, name: type.string.optional})",
      );
    });

    it("should convert object with schema references", () => {
      const zodCode = 'z.object({"prop1": SimpleDefinition})';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("type.object({prop1: SimpleDefinition})");
    });
  });

  describe("allOf / intersections", () => {
    it("should convert allOf with spread shapes to intersection", () => {
      const zodCode =
        "z.object({...PaginationResponse.shape, ...NewModel.shape})";
      const result = convertZodToArkType(zodCode, "TestSchema");
      /* Should handle allOf pattern */
      expect(result.code).toContain("intersection");
    });

    it("should convert single shape spread to schema reference", () => {
      const zodCode = "z.object({...SimpleDefinition.shape})";
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("SimpleDefinition");
    });
  });

  describe("unions", () => {
    it("should convert z.union() to type.union()", () => {
      const zodCode = "z.union([EnabledUserTest, DisabledUserTest])";
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("type.union(EnabledUserTest, DisabledUserTest)");
    });

    it("should convert discriminated union", () => {
      const zodCode = 'z.discriminatedUnion("type", [SchemaA, SchemaB])';
      const result = convertZodToArkType(zodCode, "TestSchema");
      expect(result.code).toBe("type.union(SchemaA, SchemaB)");
    });
  });

  describe("literals and enums", () => {
    it("should convert z.literal() to type.literal()", () => {
      const result = convertZodToArkType('z.literal("active")', "TestSchema");
      expect(result.code).toBe('type.literal("active")');
    });

    it("should convert z.enum() to type.union()", () => {
      const result = convertZodToArkType(
        'z.enum(["pending", "active", "closed"])',
        "TestSchema",
      );
      expect(result.code).toBe('type.union("pending", "active", "closed")');
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
      /* Empty input should return unknown */
      expect(result.code).toBe("type.unknown");
    });
  });
});
