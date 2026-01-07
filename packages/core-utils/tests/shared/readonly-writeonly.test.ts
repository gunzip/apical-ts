import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import {
  analyzeReadWriteProperties,
  shouldIncludeProperty,
} from "../../src/shared/types.js";

describe("readOnly/writeOnly utilities", () => {
  describe("analyzeReadWriteProperties", () => {
    it("should detect readOnly properties", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
        },
      };

      const result = analyzeReadWriteProperties(schema);

      expect(result.hasReadOnly).toBe(true);
      expect(result.hasWriteOnly).toBe(false);
      expect(result.readOnlyKeys).toEqual(["id"]);
      expect(result.writeOnlyKeys).toEqual([]);
    });

    it("should detect writeOnly properties", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          name: { type: "string" },
          password: { type: "string", writeOnly: true },
        },
      };

      const result = analyzeReadWriteProperties(schema);

      expect(result.hasReadOnly).toBe(false);
      expect(result.hasWriteOnly).toBe(true);
      expect(result.readOnlyKeys).toEqual([]);
      expect(result.writeOnlyKeys).toEqual(["password"]);
    });

    it("should detect both readOnly and writeOnly properties", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", readOnly: true },
          name: { type: "string" },
          password: { type: "string", writeOnly: true },
          createdAt: { type: "string", format: "date-time", readOnly: true },
        },
      };

      const result = analyzeReadWriteProperties(schema);

      expect(result.hasReadOnly).toBe(true);
      expect(result.hasWriteOnly).toBe(true);
      expect(result.readOnlyKeys).toEqual(["id", "createdAt"]);
      expect(result.writeOnlyKeys).toEqual(["password"]);
    });

    it("should return empty results for schema without properties", () => {
      const schema: SchemaObject = {
        type: "object",
      };

      const result = analyzeReadWriteProperties(schema);

      expect(result.hasReadOnly).toBe(false);
      expect(result.hasWriteOnly).toBe(false);
      expect(result.readOnlyKeys).toEqual([]);
      expect(result.writeOnlyKeys).toEqual([]);
    });

    it("should return empty results for reference object", () => {
      const refSchema = { $ref: "#/components/schemas/User" };

      const result = analyzeReadWriteProperties(refSchema);

      expect(result.hasReadOnly).toBe(false);
      expect(result.hasWriteOnly).toBe(false);
    });
  });

  describe("shouldIncludeProperty", () => {
    it("should include all properties in base context", () => {
      const readOnlyProp: SchemaObject = { type: "string", readOnly: true };
      const writeOnlyProp: SchemaObject = { type: "string", writeOnly: true };
      const normalProp: SchemaObject = { type: "string" };

      expect(shouldIncludeProperty(readOnlyProp, "base")).toBe(true);
      expect(shouldIncludeProperty(writeOnlyProp, "base")).toBe(true);
      expect(shouldIncludeProperty(normalProp, "base")).toBe(true);
    });

    it("should exclude readOnly properties in request context", () => {
      const readOnlyProp: SchemaObject = { type: "string", readOnly: true };
      const writeOnlyProp: SchemaObject = { type: "string", writeOnly: true };
      const normalProp: SchemaObject = { type: "string" };

      expect(shouldIncludeProperty(readOnlyProp, "request")).toBe(false);
      expect(shouldIncludeProperty(writeOnlyProp, "request")).toBe(true);
      expect(shouldIncludeProperty(normalProp, "request")).toBe(true);
    });

    it("should exclude writeOnly properties in response context", () => {
      const readOnlyProp: SchemaObject = { type: "string", readOnly: true };
      const writeOnlyProp: SchemaObject = { type: "string", writeOnly: true };
      const normalProp: SchemaObject = { type: "string" };

      expect(shouldIncludeProperty(readOnlyProp, "response")).toBe(true);
      expect(shouldIncludeProperty(writeOnlyProp, "response")).toBe(false);
      expect(shouldIncludeProperty(normalProp, "response")).toBe(true);
    });

    it("should include reference objects in all contexts", () => {
      const refProp = { $ref: "#/components/schemas/Address" };

      expect(shouldIncludeProperty(refProp, "base")).toBe(true);
      expect(shouldIncludeProperty(refProp, "request")).toBe(true);
      expect(shouldIncludeProperty(refProp, "response")).toBe(true);
    });
  });
});
