import type { SchemaObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import {
  generateSchemaVariants,
  type SchemaVariantsResult,
} from "../../src/schema-generator/file-generators.js";

describe("generateSchemaVariants", () => {
  it("should return no variants for schema without readOnly/writeOnly", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };

    const result = generateSchemaVariants("User", schema);

    expect(result.hasVariants).toBe(false);
    expect(result.requestContent).toBeUndefined();
    expect(result.responseContent).toBeUndefined();
  });

  it("should generate Request variant for schema with readOnly properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
      },
    };

    const result = generateSchemaVariants("User", schema);

    expect(result.hasVariants).toBe(true);
    expect(result.requestContent).toBeDefined();
    expect(result.requestContent).toContain("UserRequest");
    expect(result.requestContent).toContain('"name"');
    expect(result.requestContent).not.toContain('"id"');
    expect(result.responseContent).toBeUndefined();
  });

  it("should generate Response variant for schema with writeOnly properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        password: { type: "string", writeOnly: true },
      },
    };

    const result = generateSchemaVariants("User", schema);

    expect(result.hasVariants).toBe(true);
    expect(result.requestContent).toBeUndefined();
    expect(result.responseContent).toBeDefined();
    expect(result.responseContent).toContain("UserResponse");
    expect(result.responseContent).toContain('"name"');
    expect(result.responseContent).not.toContain('"password"');
  });

  it("should generate both variants for schema with readOnly and writeOnly properties", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
        password: { type: "string", writeOnly: true },
        createdAt: { type: "string", format: "date-time", readOnly: true },
      },
    };

    const result = generateSchemaVariants("User", schema);

    expect(result.hasVariants).toBe(true);
    expect(result.requestContent).toBeDefined();
    expect(result.responseContent).toBeDefined();
    expect(result.requestContent).toContain("UserRequest");
    expect(result.requestContent).toContain('"name"');
    expect(result.requestContent).toContain('"password"');
    expect(result.requestContent).not.toContain('"id"');
    expect(result.requestContent).not.toContain('"createdAt"');
    expect(result.responseContent).toContain("UserResponse");
    expect(result.responseContent).toContain('"name"');
    expect(result.responseContent).toContain('"id"');
    expect(result.responseContent).toContain('"createdAt"');
    expect(result.responseContent).not.toContain('"password"');
  });

  it("should include type inference for variants", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
      },
    };

    const result = generateSchemaVariants("User", schema);

    expect(result.requestContent).toContain(
      "export type UserRequest = z.infer<typeof UserRequest>;",
    );
  });

  it("should handle property names that need JSON escaping", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        "created-at": { type: "string", readOnly: true },
        name: { type: "string" },
      },
    };

    const result = generateSchemaVariants("User", schema);

    expect(result.requestContent).toContain('"name"');
    expect(result.requestContent).not.toContain('"created-at"');
  });
});
