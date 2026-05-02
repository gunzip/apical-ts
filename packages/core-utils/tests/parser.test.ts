import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  hasExternalRefPointers,
  parseOpenAPI,
  parseOpenAPIDocument,
} from "../src/core-generator/parser.js";
import {
  isRawJsonSchemaDocument,
  normalizeParsedInputDocument,
} from "../src/core-generator/input-normalizer.js";

describe("OpenAPI parser", () => {
  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("parses internal-only documents without flagging external refs", async () => {
    const specPath = fileURLToPath(
      new URL("./fixtures/internal-refs.yaml", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(hasExternalRefPointers(parsed)).toBe(false);

    const openApiDoc = await parseOpenAPI(specPath);
    expect(openApiDoc.openapi).toBe("3.1.0");

    const userSchema = openApiDoc.components?.schemas?.User;
    expect(userSchema).toBeDefined();
    if (!userSchema || "$ref" in userSchema) {
      expect.fail("Expected User to be emitted as a schema object");
    }

    expect(userSchema.properties?.address).toEqual({
      $ref: "#/components/schemas/Address",
    });
    expect(userSchema.properties?.name).toMatchObject({
      type: ["string", "null"],
    });
  });

  it("detects external ref pointers before bundling", async () => {
    const specPath = fileURLToPath(
      new URL("./fixtures/external-root.yaml", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(hasExternalRefPointers(parsed)).toBe(true);
  });

  it("normalizes raw JSON Schema input into OpenAPI components", async () => {
    const specPath = fileURLToPath(
      new URL("./fixtures/raw-json-schema.yaml", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(isRawJsonSchemaDocument(parsed)).toBe(true);

    const normalized = normalizeParsedInputDocument(parsed, {
      sourcePath: specPath,
    });

    expect(normalized.kind).toBe("json-schema");
    expect(normalized.rootSchemaName).toBe("Person");

    const openApiDoc = normalized.document;
    expect(typeof openApiDoc).toBe("object");
    expect(openApiDoc).toMatchObject({
      openapi: "3.1.0",
    });

    if (
      !openApiDoc ||
      typeof openApiDoc !== "object" ||
      !("components" in openApiDoc)
    ) {
      expect.fail(
        "Expected normalized raw JSON Schema to be wrapped as OpenAPI",
      );
    }

    const normalizedOpenApi = openApiDoc as {
      components?: { schemas?: Record<string, unknown> };
    };
    const schemas = normalizedOpenApi.components?.schemas;
    const personSchema = schemas?.Person;
    const addressSchema = schemas?.Address;

    expect(personSchema).toBeDefined();
    expect(addressSchema).toBeDefined();
    expect(schemas?.Country).toBeDefined();
    expect(schemas?.LegacyTag).toBeDefined();

    if (
      !personSchema ||
      typeof personSchema !== "object" ||
      Array.isArray(personSchema) ||
      "$ref" in personSchema
    ) {
      expect.fail(
        "Expected Person to be emitted as a normalized schema object",
      );
    }

    if (
      !addressSchema ||
      typeof addressSchema !== "object" ||
      Array.isArray(addressSchema) ||
      "$ref" in addressSchema
    ) {
      expect.fail(
        "Expected Address to be emitted as a normalized schema object",
      );
    }

    const normalizedPersonSchema = personSchema as {
      properties?: Record<string, unknown>;
    };
    const normalizedAddressSchema = addressSchema as {
      properties?: Record<string, unknown>;
    };

    expect(normalizedPersonSchema.properties?.address).toEqual({
      $ref: "#/components/schemas/Address",
    });
    expect(normalizedPersonSchema.properties?.legacyTag).toEqual({
      $ref: "#/components/schemas/LegacyTag",
    });
    expect(normalizedPersonSchema.properties?.manager).toEqual({
      $ref: "#/components/schemas/Person",
    });
    expect(normalizedAddressSchema.properties?.country).toEqual({
      $ref: "#/components/schemas/Country",
    });
  });

  it("wraps boolean JSON Schema roots using the source file name", async () => {
    const specPath = fileURLToPath(
      new URL("./fixtures/raw-boolean-schema.json", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(isRawJsonSchemaDocument(parsed)).toBe(true);

    const openApiDoc = await parseOpenAPI(specPath);
    expect(openApiDoc.openapi).toBe("3.1.0");
    expect(openApiDoc.components?.schemas?.rawBooleanSchema).toBe(false);
  });
});
