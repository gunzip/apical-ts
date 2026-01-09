import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import { resolveSchemaTypeName } from "../../src/shared/schema-type-resolver.js";

describe("resolveSchemaTypeName with readOnly/writeOnly context", () => {
  const createResolvedSchemas = () => ({
    User: {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
        password: { type: "string", writeOnly: true },
      },
    } as SchemaObject,
    Address: {
      type: "object",
      properties: {
        street: { type: "string" },
        city: { type: "string" },
      },
    } as SchemaObject,
    ReadOnlyData: {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        createdAt: { type: "string", readOnly: true },
      },
    } as SchemaObject,
    WriteOnlyData: {
      type: "object",
      properties: {
        password: { type: "string", writeOnly: true },
        secret: { type: "string", writeOnly: true },
      },
    } as SchemaObject,
  });

  describe("request context", () => {
    it("should use Request variant for schema with readOnly properties", () => {
      const typeImports = new Set<string>();
      const resolvedSchemas = createResolvedSchemas();

      const result = resolveSchemaTypeName(
        { $ref: "#/components/schemas/User" },
        "createUser",
        "Request",
        typeImports,
        "request",
        resolvedSchemas,
      );

      expect(result).toBe("UserRequest");
      expect(typeImports.has("UserRequest")).toBe(true);
    });

    it("should use base name for schema without readOnly properties", () => {
      const typeImports = new Set<string>();
      const resolvedSchemas = createResolvedSchemas();

      const result = resolveSchemaTypeName(
        { $ref: "#/components/schemas/Address" },
        "createAddress",
        "Request",
        typeImports,
        "request",
        resolvedSchemas,
      );

      expect(result).toBe("Address");
      expect(typeImports.has("Address")).toBe(true);
    });
  });

  describe("response context", () => {
    it("should use Response variant for schema with writeOnly properties", () => {
      const typeImports = new Set<string>();
      const resolvedSchemas = createResolvedSchemas();

      const result = resolveSchemaTypeName(
        { $ref: "#/components/schemas/User" },
        "getUser",
        "Response",
        typeImports,
        "response",
        resolvedSchemas,
      );

      expect(result).toBe("UserResponse");
      expect(typeImports.has("UserResponse")).toBe(true);
    });

    it("should use base name for schema without writeOnly properties", () => {
      const typeImports = new Set<string>();
      const resolvedSchemas = createResolvedSchemas();

      const result = resolveSchemaTypeName(
        { $ref: "#/components/schemas/Address" },
        "getAddress",
        "Response",
        typeImports,
        "response",
        resolvedSchemas,
      );

      expect(result).toBe("Address");
      expect(typeImports.has("Address")).toBe(true);
    });
  });

  describe("without context", () => {
    it("should use base name when no context is provided", () => {
      const typeImports = new Set<string>();
      const resolvedSchemas = createResolvedSchemas();

      const result = resolveSchemaTypeName(
        { $ref: "#/components/schemas/User" },
        "getUser",
        "Response",
        typeImports,
        undefined,
        resolvedSchemas,
      );

      expect(result).toBe("User");
      expect(typeImports.has("User")).toBe(true);
    });

    it("should use base name when no resolved schemas are provided", () => {
      const typeImports = new Set<string>();

      const result = resolveSchemaTypeName(
        { $ref: "#/components/schemas/User" },
        "getUser",
        "Response",
        typeImports,
        "response",
        undefined,
      );

      expect(result).toBe("User");
      expect(typeImports.has("User")).toBe(true);
    });
  });

  describe("inline schemas", () => {
    it("should generate operation-scoped name for inline schemas", () => {
      const typeImports = new Set<string>();
      const inlineSchema: SchemaObject = {
        type: "object",
        properties: { name: { type: "string" } },
      };

      const result = resolveSchemaTypeName(
        inlineSchema,
        "createUser",
        "Request",
        typeImports,
        "request",
        createResolvedSchemas(),
      );

      expect(result).toBe("CreateUserRequest");
      expect(typeImports.has("CreateUserRequest")).toBe(true);
    });
  });
});
