import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import {
  generateSchemaVariants,
  type SchemaVariantsResult,
} from "@apical-ts/core-utils";

describe("generateSchemaVariants", () => {
  it("should return no variants for schema without readOnly/writeOnly", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };

    const result = generateSchemaVariants(schema);

    expect(result.hasRequest).toBe(false);
    expect(result.hasResponse).toBe(false);
  });

  it("should detect Request variant needed for schema with readOnly properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
      },
    };

    const result = generateSchemaVariants(schema);

    expect(result.hasRequest).toBe(true);
    expect(result.hasResponse).toBe(false);
  });

  it("should detect Response variant needed for schema with writeOnly properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        password: { type: "string", writeOnly: true },
      },
    };

    const result = generateSchemaVariants(schema);

    expect(result.hasRequest).toBe(false);
    expect(result.hasResponse).toBe(true);
  });

  it("should detect both variants needed for schema with readOnly and writeOnly properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
        password: { type: "string", writeOnly: true },
        createdAt: { type: "string", format: "date-time", readOnly: true },
      },
    };

    const result = generateSchemaVariants(schema);

    expect(result.hasRequest).toBe(true);
    expect(result.hasResponse).toBe(true);
  });
});
