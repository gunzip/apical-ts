/*
 * Unit tests for Zod to ArkType converter (fold-based)
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { convertZodToArkType } from "../src/converter.js";

describe("convertZodToArkType", () => {
  describe("primitive types", () => {
    it('should convert z.string() to type("string")', () => {
      const result = convertZodToArkType(z.string(), "TestSchema");
      expect(result.code).toBe('type("string")');
      expect(result.schemaName).toBe("TestSchema");
    });

    it('should convert z.number() to type("number")', () => {
      const result = convertZodToArkType(z.number(), "TestSchema");
      expect(result.code).toBe('type("number")');
    });

    it('should convert z.boolean() to type("boolean")', () => {
      const result = convertZodToArkType(z.boolean(), "TestSchema");
      expect(result.code).toBe('type("boolean")');
    });

    it('should convert z.unknown() to type("unknown")', () => {
      const result = convertZodToArkType(z.unknown(), "TestSchema");
      expect(result.code).toBe('type("unknown")');
    });

    it('should convert z.any() to type("unknown")', () => {
      const result = convertZodToArkType(z.any(), "TestSchema");
      expect(result.code).toBe('type("unknown")');
    });

    it('should convert z.null() to type("null")', () => {
      const result = convertZodToArkType(z.null(), "TestSchema");
      expect(result.code).toBe('type("null")');
    });

    it('should convert z.undefined() to type("undefined")', () => {
      const result = convertZodToArkType(z.undefined(), "TestSchema");
      expect(result.code).toBe('type("undefined")');
    });
  });

  describe("string modifiers", () => {
    it("should keep z.string().optional() as base type for top-level", () => {
      const result = convertZodToArkType(z.string().optional(), "TestSchema");
      // optionality is applied at object property level; top-level remains inner type
      expect(result.code).toBe('type("string")');
    });

    it('should convert z.string().email() to type("string.email")', () => {
      const result = convertZodToArkType(z.string().email(), "TestSchema");
      expect(result.code).toBe('type("string.email")');
    });

    it('should convert z.string().url() to type("string.url")', () => {
      const result = convertZodToArkType(z.string().url(), "TestSchema");
      expect(result.code).toBe('type("string.url")');
    });

    it('should convert z.string().uuid() to type("string.uuid")', () => {
      const result = convertZodToArkType(z.string().uuid(), "TestSchema");
      expect(result.code).toBe('type("string.uuid")');
    });

    it('should convert z.string().min(3) to type("string.min(3)")', () => {
      const result = convertZodToArkType(z.string().min(3), "TestSchema");
      expect(result.code).toBe('type("string.min(3)")');
    });

    it('should convert z.string().max(10) to type("string.max(10)")', () => {
      const result = convertZodToArkType(z.string().max(10), "TestSchema");
      expect(result.code).toBe('type("string.max(10)")');
    });

    it("should convert z.string().min(3).max(10) to include both constraints", () => {
      const result = convertZodToArkType(
        z.string().min(3).max(10),
        "TestSchema",
      );
      expect(result.code).toBe('type("string.max(10).min(3)")');
    });

    it("should convert z.string().regex(/abc/) to include regex constraint", () => {
      const result = convertZodToArkType(z.string().regex(/abc/), "TestSchema");
      expect(result.code).toBe('type("string.regex(/abc/)")');
    });

    it("should preserve email format with length constraints", () => {
      const result = convertZodToArkType(
        z.string().email().min(5),
        "TestSchema",
      );
      expect(result.code).toBe('type("string.email.min(5)")');
    });
  });

  describe("number modifiers", () => {
    it("should keep z.number().optional() as base type for top-level", () => {
      const result = convertZodToArkType(z.number().optional(), "TestSchema");
      expect(result.code).toBe('type("number")');
    });

    it('should convert z.number().int() to type("number.integer")', () => {
      const result = convertZodToArkType(z.number().int(), "TestSchema");
      expect(result.code).toBe('type("number.integer")');
    });

    it('should convert z.number().min(5) to type("number.min(5)")', () => {
      const result = convertZodToArkType(z.number().min(5), "TestSchema");
      expect(result.code).toBe('type("number.min(5)")');
    });

    it('should convert z.number().max(100) to type("number.max(100)")', () => {
      const result = convertZodToArkType(z.number().max(100), "TestSchema");
      expect(result.code).toBe('type("number.max(100)")');
    });

    it("should convert z.number().min(1).max(10) to include both constraints", () => {
      const result = convertZodToArkType(
        z.number().min(1).max(10),
        "TestSchema",
      );
      expect(result.code).toBe('type("number.max(10).min(1)")');
    });

    it('should convert z.number().gt(0) to type("number.gt(0)")', () => {
      const result = convertZodToArkType(z.number().gt(0), "TestSchema");
      expect(result.code).toBe('type("number.gt(0)")');
    });

    it('should convert z.number().lt(100) to type("number.lt(100)")', () => {
      const result = convertZodToArkType(z.number().lt(100), "TestSchema");
      expect(result.code).toBe('type("number.lt(100)")');
    });

    it("should convert z.number().multipleOf(5) to include multipleOf constraint", () => {
      const result = convertZodToArkType(
        z.number().multipleOf(5),
        "TestSchema",
      );
      expect(result.code).toBe('type("number.multipleOf(5)")');
    });

    it("should convert z.number().int().min(1).max(100) to include all constraints", () => {
      const result = convertZodToArkType(
        z.number().int().min(1).max(100),
        "TestSchema",
      );
      expect(result.code).toBe('type("number.integer.max(100).min(1)")');
    });
  });

  describe("arrays", () => {
    it('should convert z.array(z.string()) to (type("string")).array()', () => {
      const result = convertZodToArkType(z.array(z.string()), "TestSchema");
      expect(result.code).toBe('(type("string")).array()');
    });

    it('should convert z.array(z.number()) to (type("number")).array()', () => {
      const result = convertZodToArkType(z.array(z.number()), "TestSchema");
      expect(result.code).toBe('(type("number")).array()');
    });
  });

  describe("objects", () => {
    it("should convert simple object", () => {
      const schema = z.object({ id: z.string() });
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toBe('type({id: "string"})');
    });

    it("should convert object with multiple properties", () => {
      const schema = z.object({ id: z.string(), age: z.number() });
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toBe('type({id: "string", age: "number"})');
    });

    it("should convert object with optional properties", () => {
      const schema = z.object({ id: z.string(), name: z.string().optional() });
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toBe('type({id: "string", "name?": "string"})');
    });

    it("should convert nested objects inline", () => {
      const schema = z.object({
        id: z.string(),
        profile: z.object({ bio: z.string().optional(), age: z.number() }),
      });
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toBe(
        'type({id: "string", profile: type({"bio?": "string", age: "number"})})',
      );
    });

    it("should preserve reference identifiers on properties", () => {
      const Address = z.any().describe("ref:Address");
      const schema = z.object({ address: Address });
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toBe("type({address: Address})");
    });
  });

  describe("intersections", () => {
    it("should convert intersections to .and()", () => {
      const a = z.object({ id: z.string() });
      const b = z.object({ name: z.string() });
      // emulate intersection via z.intersection
      const schema = z.intersection(a, b);
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toContain(".and(");
    });
  });

  describe("unions", () => {
    it("should convert z.union() to a chain of .or()", () => {
      const schema = z.union([z.literal("Enabled"), z.literal("Disabled")]);
      const result = convertZodToArkType(schema, "TestSchema");
      expect(result.code).toContain(".or(");
      expect(result.code).toContain("type.enumerated");
    });
  });

  describe("literals and enums", () => {
    it("should convert z.literal() to type.enumerated()", () => {
      const result = convertZodToArkType(z.literal("active"), "TestSchema");
      expect(result.code).toBe('type.enumerated("active")');
    });

    it("should convert z.enum() to type.enumerated()", () => {
      const result = convertZodToArkType(
        z.enum(["pending", "active", "closed"]),
        "TestSchema",
      );
      expect(result.code).toBe(
        'type.enumerated("pending", "active", "closed")',
      );
    });
  });

  describe("error handling", () => {
    it("should handle non-zod input", () => {
      const result = convertZodToArkType(undefined, "TestSchema");
      /* Non-Zod input should return type("unknown") */
      expect(result.code).toBe('type("unknown")');
    });
  });
});
