import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import { handleObjectType } from "../../src/schema-generator/object-types.js";
import { zodSchemaToCode } from "../../src/schema-generator/schema-converter.js";

describe("object-types with schemaContext", () => {
  describe("handleObjectType with readOnly/writeOnly filtering", () => {
    it("should include all properties in base context", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
          password: { type: "string", writeOnly: true },
        },
      };

      const result = { code: "", imports: new Set<string>() };
      handleObjectType(schema, result, zodSchemaToCode, {
        schemaContext: "base",
      });

      expect(result.code).toContain('"id"');
      expect(result.code).toContain('"name"');
      expect(result.code).toContain('"password"');
    });

    it("should exclude readOnly properties in request context", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
          password: { type: "string", writeOnly: true },
        },
      };

      const result = { code: "", imports: new Set<string>() };
      handleObjectType(schema, result, zodSchemaToCode, {
        schemaContext: "request",
      });

      expect(result.code).not.toContain('"id"');
      expect(result.code).toContain('"name"');
      expect(result.code).toContain('"password"');
    });

    it("should exclude writeOnly properties in response context", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
          password: { type: "string", writeOnly: true },
        },
      };

      const result = { code: "", imports: new Set<string>() };
      handleObjectType(schema, result, zodSchemaToCode, {
        schemaContext: "response",
      });

      expect(result.code).toContain('"id"');
      expect(result.code).toContain('"name"');
      expect(result.code).not.toContain('"password"');
    });

    it("should default to base context when not specified", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
        },
      };

      const result = { code: "", imports: new Set<string>() };
      handleObjectType(schema, result, zodSchemaToCode);

      expect(result.code).toContain('"id"');
      expect(result.code).toContain('"name"');
    });

    it("should handle required fields correctly when filtering", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
        },
        required: ["id", "name"],
      };

      const result = { code: "", imports: new Set<string>() };
      handleObjectType(schema, result, zodSchemaToCode, {
        schemaContext: "request",
      });

      /* id is filtered out, so only name should be required (no .optional()) */
      expect(result.code).toContain('"name": z.string()');
      expect(result.code).not.toContain('"name": z.string().optional()');
    });

    it("should handle schema with only readOnly properties in request context", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          createdAt: { type: "string", readOnly: true },
        },
      };

      const result = { code: "", imports: new Set<string>() };
      handleObjectType(schema, result, zodSchemaToCode, {
        schemaContext: "request",
      });

      /* Empty object when all properties are filtered */
      expect(result.code).toBe("z.object({}).catchall(z.unknown())");
    });
  });
});
