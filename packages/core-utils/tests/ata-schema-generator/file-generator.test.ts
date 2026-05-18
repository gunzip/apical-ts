import type { SchemaObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  generateAtaFallbackContent,
  generateAtaSchemaFile,
} from "../../src/ata-schema-generator/file-generator.js";

describe("generateAtaSchemaFile", () => {
  it("should generate a schema file for a simple string type", async () => {
    const schema: SchemaObject = { type: "string" };
    const result = await generateAtaSchemaFile("Color", schema);

    expect(result.fileName).toBe("Color.ts");
    expect(result.content).toContain("StandardSchemaV1");
    expect(result.content).toContain("export");
    expect(result.content).toContain("Color");
    expect(result.content).toContain("~standard");
    expect(result.content).toContain("ata-validator");
    expect(result.content).toContain("validate");
  });

  it("should generate a schema file for an object type", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
      required: ["name"],
    };

    const result = await generateAtaSchemaFile("User", schema);

    expect(result.fileName).toBe("User.ts");
    expect(result.content).toContain("User");
    expect(result.content).toContain("StandardSchemaV1");
  });

  it("should produce auxiliary .compiled.mjs file", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: { id: { type: "string" } },
    };

    const result = await generateAtaSchemaFile("Item", schema);

    expect(result.auxiliaryFiles).toBeDefined();
    expect(result.auxiliaryFiles!.length).toBeGreaterThanOrEqual(1);

    const compiledFile = result.auxiliaryFiles!.find((f) =>
      f.fileName.endsWith(".compiled.mjs"),
    );
    expect(compiledFile).toBeDefined();
    expect(compiledFile!.fileName).toBe("Item.compiled.mjs");
    /* The compiled file should export validate and isValid */
    expect(compiledFile!.content).toContain("validate");
    expect(compiledFile!.content).toContain("isValid");
  });

  it("should import validate from the compiled .mjs file", async () => {
    const schema: SchemaObject = { type: "boolean" };
    const result = await generateAtaSchemaFile("Flag", schema);

    expect(result.content).toContain(
      'import { validate as _ata_validate } from "./Flag.compiled.mjs"',
    );
  });

  it("should include description as JSDoc comment in output", async () => {
    const schema: SchemaObject = { type: "string" };
    const result = await generateAtaSchemaFile("Status", schema, {
      description: "The current status of the item",
    });

    expect(result.content).toContain("The current status of the item");
  });

  it("should handle enum schemas", async () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["active", "inactive", "pending"],
    };

    const result = await generateAtaSchemaFile("StatusEnum", schema);

    expect(result.fileName).toBe("StatusEnum.ts");
    expect(result.content).toContain("StatusEnum");
    /* The compiled file should contain validation for enum values */
    const compiled = result.auxiliaryFiles?.find((f) =>
      f.fileName.endsWith(".compiled.mjs"),
    );
    expect(compiled).toBeDefined();
  });

  it("should handle schema with string format", async () => {
    const schema: SchemaObject = {
      type: "string",
      format: "date-time",
    };

    const result = await generateAtaSchemaFile("Timestamp", schema);
    expect(result.fileName).toBe("Timestamp.ts");
    expect(result.content).toContain("Timestamp");
  });

  it("should pass resolvedSchemas for cross-ref resolution", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        address: { $ref: "#/components/schemas/Address" },
      },
    };

    const resolvedSchemas = {
      Address: {
        type: "object",
        properties: { city: { type: "string" } },
      },
    };

    const result = await generateAtaSchemaFile("Person", schema, {
      resolvedSchemas,
    });

    expect(result.fileName).toBe("Person.ts");
    expect(result.content).toContain("Person");
  });

  it("should generate variant files for readOnly properties", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        name: { type: "string" },
      },
    };

    const result = await generateAtaSchemaFile("Resource", schema);

    expect(result.variantFiles).toBeDefined();
    expect(result.variantFiles!.length).toBeGreaterThanOrEqual(1);

    const requestVariant = result.variantFiles!.find(
      (f) => f.fileName === "ResourceRequest.ts",
    );
    expect(requestVariant).toBeDefined();
  });

  it("should generate variant files for writeOnly properties", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        password: { type: "string", writeOnly: true },
      },
    };

    const result = await generateAtaSchemaFile("Account", schema);

    expect(result.variantFiles).toBeDefined();
    const responseVariant = result.variantFiles!.find(
      (f) => f.fileName === "AccountResponse.ts",
    );
    expect(responseVariant).toBeDefined();
  });

  it("should not generate variant files when no readOnly/writeOnly", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
    };

    const result = await generateAtaSchemaFile("Simple", schema);
    expect(result.variantFiles).toBeUndefined();
  });

  it("should apply extraProps strict mode", async () => {
    const schema: SchemaObject = {
      type: "object",
      properties: { name: { type: "string" } },
    };

    const result = await generateAtaSchemaFile("Strict", schema, {
      extraProps: "strict",
    });

    /* The compiled validator should reject extra properties */
    const compiled = result.auxiliaryFiles?.find((f) =>
      f.fileName.endsWith(".compiled.mjs"),
    );
    expect(compiled).toBeDefined();
    /* In strict mode, the validator checks for unknown keys */
    expect(compiled!.content).toContain("validate");
  });
});

describe("generateAtaFallbackContent", () => {
  it("should generate a passthrough validator for truthy schemas", () => {
    const content = generateAtaFallbackContent("Unknown", {});

    expect(content).toContain("export type Unknown = unknown");
    expect(content).toContain("StandardSchemaV1");
    expect(content).toContain("export const Unknown");
    expect(content).toContain("value: value as Unknown");
  });

  it("should generate a rejecting validator for false schemas", () => {
    const content = generateAtaFallbackContent("Never", false);

    expect(content).toContain("export type Never = never");
    expect(content).toContain("Schema rejects all values");
  });

  it("should include Standard Schema V1 interface", () => {
    const content = generateAtaFallbackContent("Test", {});

    expect(content).toContain('"~standard"');
    expect(content).toContain("version: 1");
    expect(content).toContain("ata-validator");
  });
});
