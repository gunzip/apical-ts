import { describe, expect, it } from "vitest";

import {
  buildSchemaRegistry,
  openApiSchemaToJsonSchema,
} from "../../src/ata-schema-generator/openapi-to-jsonschema.js";

describe("openApiSchemaToJsonSchema", () => {
  describe("basic conversions", () => {
    it("should pass through a simple string schema unchanged", () => {
      const result = openApiSchemaToJsonSchema({ type: "string" });
      expect(result).toEqual({ type: "string" });
    });

    it("should pass through a number schema unchanged", () => {
      const result = openApiSchemaToJsonSchema({ type: "number" });
      expect(result).toEqual({ type: "number" });
    });

    it("should pass through a boolean schema unchanged", () => {
      const result = openApiSchemaToJsonSchema({ type: "boolean" });
      expect(result).toEqual({ type: "boolean" });
    });

    it("should pass through an integer schema unchanged", () => {
      const result = openApiSchemaToJsonSchema({ type: "integer" });
      expect(result).toEqual({ type: "integer" });
    });

    it("should convert an object schema with properties", () => {
      const result = openApiSchemaToJsonSchema({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
        required: ["name"],
      });

      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
        required: ["name"],
      });
    });

    it("should convert an array schema with items", () => {
      const result = openApiSchemaToJsonSchema({
        type: "array",
        items: { type: "string" },
      });

      expect(result).toEqual({
        type: "array",
        items: { type: "string" },
      });
    });
  });

  describe("OpenAPI-specific keyword stripping", () => {
    it("should strip the deprecated keyword", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        deprecated: true,
      });
      expect(result).not.toHaveProperty("deprecated");
      expect(result).toEqual({ type: "string" });
    });

    it("should strip the example keyword", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        example: "hello",
      });
      expect(result).not.toHaveProperty("example");
    });

    it("should strip the examples keyword", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        examples: ["hello", "world"],
      });
      expect(result).not.toHaveProperty("examples");
    });

    it("should strip the externalDocs keyword", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        externalDocs: { url: "https://example.com" },
      });
      expect(result).not.toHaveProperty("externalDocs");
    });

    it("should strip the xml keyword", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        xml: { name: "test" },
      });
      expect(result).not.toHaveProperty("xml");
    });

    it("should strip the discriminator keyword", () => {
      const result = openApiSchemaToJsonSchema({
        type: "object",
        discriminator: { propertyName: "type" },
        properties: { type: { type: "string" } },
      });
      expect(result).not.toHaveProperty("discriminator");
    });

    it("should strip readOnly and writeOnly", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        readOnly: true,
        writeOnly: false,
      });
      expect(result).not.toHaveProperty("readOnly");
      expect(result).not.toHaveProperty("writeOnly");
      expect(result).toEqual({ type: "string" });
    });
  });

  describe("format handling", () => {
    it("should strip int32 format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "integer",
        format: "int32",
      });
      expect(result).not.toHaveProperty("format");
    });

    it("should strip int64 format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "integer",
        format: "int64",
      });
      expect(result).not.toHaveProperty("format");
    });

    it("should strip float format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "number",
        format: "float",
      });
      expect(result).not.toHaveProperty("format");
    });

    it("should strip double format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "number",
        format: "double",
      });
      expect(result).not.toHaveProperty("format");
    });

    it("should keep date-time format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        format: "date-time",
      });
      expect(result.format).toBe("date-time");
    });

    it("should keep email format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        format: "email",
      });
      expect(result.format).toBe("email");
    });

    it("should keep uuid format", () => {
      const result = openApiSchemaToJsonSchema({
        type: "string",
        format: "uuid",
      });
      expect(result.format).toBe("uuid");
    });
  });

  describe("composition keywords", () => {
    it("should recursively normalize allOf schemas", () => {
      const result = openApiSchemaToJsonSchema({
        allOf: [
          {
            type: "object",
            deprecated: true,
            properties: { a: { type: "string" } },
          },
          {
            type: "object",
            properties: { b: { type: "number", format: "int32" } },
          },
        ],
      });

      expect(result.allOf).toHaveLength(2);
      const allOf = result.allOf as Record<string, unknown>[];
      expect(allOf[0]).not.toHaveProperty("deprecated");
      expect(
        (allOf[1] as { properties: Record<string, unknown> }).properties.b,
      ).not.toHaveProperty("format");
    });

    it("should recursively normalize oneOf schemas", () => {
      const result = openApiSchemaToJsonSchema({
        oneOf: [{ type: "string", example: "hello" }, { type: "number" }],
      });

      expect(result.oneOf).toHaveLength(2);
      const oneOf = result.oneOf as Record<string, unknown>[];
      expect(oneOf[0]).not.toHaveProperty("example");
    });

    it("should recursively normalize anyOf schemas", () => {
      const result = openApiSchemaToJsonSchema({
        anyOf: [{ type: "string", xml: { name: "test" } }, { type: "boolean" }],
      });

      const anyOf = result.anyOf as Record<string, unknown>[];
      expect(anyOf[0]).not.toHaveProperty("xml");
    });

    it("should recursively normalize not schema", () => {
      const result = openApiSchemaToJsonSchema({
        not: { type: "string", deprecated: true },
      });

      expect(result.not).not.toHaveProperty("deprecated");
    });
  });

  describe("$ref handling", () => {
    it("should pass through $ref as-is", () => {
      const result = openApiSchemaToJsonSchema({
        $ref: "#/components/schemas/User",
      });
      expect(result.$ref).toBe("#/components/schemas/User");
    });
  });

  describe("additionalProperties handling", () => {
    it("should pass through boolean additionalProperties", () => {
      const result = openApiSchemaToJsonSchema({
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: false,
      });
      expect(result.additionalProperties).toBe(false);
    });

    it("should recursively normalize schema additionalProperties", () => {
      const result = openApiSchemaToJsonSchema({
        type: "object",
        properties: { name: { type: "string" } },
        additionalProperties: { type: "string", deprecated: true },
      });
      const ap = result.additionalProperties as Record<string, unknown>;
      expect(ap.type).toBe("string");
      expect(ap).not.toHaveProperty("deprecated");
    });
  });

  describe("extraProps mode", () => {
    it("should add additionalProperties: false for strict mode on objects", () => {
      const result = openApiSchemaToJsonSchema(
        { type: "object", properties: { name: { type: "string" } } },
        { extraProps: "strict" },
      );
      expect(result.additionalProperties).toBe(false);
    });

    it("should add additionalProperties: false for strip mode on objects", () => {
      const result = openApiSchemaToJsonSchema(
        { type: "object", properties: { name: { type: "string" } } },
        { extraProps: "strip" },
      );
      expect(result.additionalProperties).toBe(false);
    });

    it("should not add additionalProperties for loose mode", () => {
      const result = openApiSchemaToJsonSchema(
        { type: "object", properties: { name: { type: "string" } } },
        { extraProps: "loose" },
      );
      expect(result).not.toHaveProperty("additionalProperties");
    });

    it("should not override existing additionalProperties", () => {
      const result = openApiSchemaToJsonSchema(
        {
          type: "object",
          properties: { name: { type: "string" } },
          additionalProperties: true,
        },
        { extraProps: "strict" },
      );
      expect(result.additionalProperties).toBe(true);
    });

    it("should not apply extraProps to non-object schemas", () => {
      const result = openApiSchemaToJsonSchema(
        { type: "string" },
        { extraProps: "strict" },
      );
      expect(result).not.toHaveProperty("additionalProperties");
    });
  });

  describe("schema context filtering", () => {
    it("should remove readOnly properties in request context", () => {
      const result = openApiSchemaToJsonSchema(
        {
          type: "object",
          properties: {
            id: { type: "string", readOnly: true },
            name: { type: "string" },
          },
          required: ["id", "name"],
        },
        { schemaContext: "request" },
      );

      const props = result.properties as Record<string, unknown>;
      expect(props).not.toHaveProperty("id");
      expect(props).toHaveProperty("name");
      expect(result.required).toEqual(["name"]);
    });

    it("should remove writeOnly properties in response context", () => {
      const result = openApiSchemaToJsonSchema(
        {
          type: "object",
          properties: {
            name: { type: "string" },
            password: { type: "string", writeOnly: true },
          },
          required: ["name", "password"],
        },
        { schemaContext: "response" },
      );

      const props = result.properties as Record<string, unknown>;
      expect(props).toHaveProperty("name");
      expect(props).not.toHaveProperty("password");
      expect(result.required).toEqual(["name"]);
    });

    it("should not filter properties in base context", () => {
      const result = openApiSchemaToJsonSchema(
        {
          type: "object",
          properties: {
            id: { type: "string", readOnly: true },
            password: { type: "string", writeOnly: true },
            name: { type: "string" },
          },
        },
        { schemaContext: "base" },
      );

      const props = result.properties as Record<string, unknown>;
      expect(props).toHaveProperty("id");
      expect(props).toHaveProperty("password");
      expect(props).toHaveProperty("name");
    });
  });

  describe("discriminator injection", () => {
    it("should inject const into oneOf variants from explicit mapping", () => {
      const result = openApiSchemaToJsonSchema({
        oneOf: [
          { $ref: "#/components/schemas/Cat" },
          { $ref: "#/components/schemas/Dog" },
        ],
        discriminator: {
          propertyName: "petType",
          mapping: {
            cat: "#/components/schemas/Cat",
            dog: "#/components/schemas/Dog",
          },
        },
      });

      const oneOf = result.oneOf as Record<string, unknown>[];
      expect(oneOf[0]).toHaveProperty("allOf");
      const catAllOf = (oneOf[0] as { allOf: Record<string, unknown>[] }).allOf;
      expect(catAllOf[1]).toMatchObject({
        properties: { petType: { const: "cat" } },
        required: ["petType"],
      });
    });

    it("should infer const from single-value enum in variants", () => {
      const result = openApiSchemaToJsonSchema({
        oneOf: [
          {
            type: "object",
            properties: { petType: { type: "string", enum: ["cat"] } },
          },
          {
            type: "object",
            properties: { petType: { type: "string", enum: ["dog"] } },
          },
        ],
        discriminator: { propertyName: "petType" },
      });

      const oneOf = result.oneOf as Array<{
        properties: Record<string, Record<string, unknown>>;
      }>;
      expect(oneOf[0].properties.petType).toEqual({ const: "cat" });
      expect(oneOf[1].properties.petType).toEqual({ const: "dog" });
    });
  });
});

describe("buildSchemaRegistry", () => {
  it("should build a registry of normalized schemas with $id", () => {
    const schemas = {
      User: { type: "object", properties: { name: { type: "string" } } },
      Post: {
        type: "object",
        properties: { title: { type: "string", deprecated: true } },
      },
    };

    const registry = buildSchemaRegistry(schemas);

    expect(registry.User.$id).toBe("#/components/schemas/User");
    expect(registry.User.type).toBe("object");

    expect(registry.Post.$id).toBe("#/components/schemas/Post");
    const postProps = registry.Post.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(postProps.title).not.toHaveProperty("deprecated");
  });

  it("should skip non-schema objects ($ref references)", () => {
    const schemas = {
      User: { type: "object", properties: { name: { type: "string" } } },
      Alias: { $ref: "#/components/schemas/User" },
    };

    const registry = buildSchemaRegistry(schemas);

    expect(registry.User).toBeDefined();
    expect(registry.Alias).toBeUndefined();
  });

  it("should apply extraProps option to all schemas", () => {
    const schemas = {
      User: { type: "object", properties: { name: { type: "string" } } },
    };

    const registry = buildSchemaRegistry(schemas, { extraProps: "strict" });
    expect(registry.User.additionalProperties).toBe(false);
  });
});
