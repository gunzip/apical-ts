import { fileURLToPath } from "node:url";

import { parseOpenAPIDocument } from "@apical-ts/core-utils";
import { describe, expect, it } from "vitest";

import {
  isRawJsonSchemaDocument,
  normalizeRawJsonSchemaDocument,
} from "../src/json-schema-normalizer.js";

describe("JSON Schema normalizer", () => {
  it("normalizes raw JSON Schema input into OpenAPI components", async () => {
    const specPath = fileURLToPath(
      new URL("./integrations/fixtures/raw-json-schema.yaml", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(isRawJsonSchemaDocument(parsed)).toBe(true);

    const normalized = normalizeRawJsonSchemaDocument(parsed, {
      sourcePath: specPath,
    });

    expect(normalized.rootSchemaName).toBe("Person");
    expect(normalized.document).toMatchObject({
      openapi: "3.1.0",
    });

    const schemas = normalized.document.components?.schemas;
    const personSchema = schemas?.Person;
    const addressSchema = schemas?.Address;

    expect(personSchema).toBeDefined();
    expect(addressSchema).toBeDefined();
    expect(schemas?.Country).toBeDefined();

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
    expect(normalizedAddressSchema.properties?.country).toEqual({
      $ref: "#/components/schemas/Country",
    });
  });

  it("wraps boolean JSON Schema roots using the source file name", async () => {
    const specPath = fileURLToPath(
      new URL(
        "./integrations/fixtures/raw-boolean-schema.json",
        import.meta.url,
      ),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(isRawJsonSchemaDocument(parsed)).toBe(true);

    const normalized = normalizeRawJsonSchemaDocument(parsed, {
      sourcePath: specPath,
    });

    expect(normalized.document.openapi).toBe("3.1.0");
    expect(normalized.document.components?.schemas?.rawBooleanSchema).toBe(
      false,
    );
  });
});
