import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateAtaSchemas } from "../../src/ata-schema-generator/index.js";

/*
 * Integration test for the full ATA schema generation pipeline.
 * Verifies end-to-end generation from an OpenAPI document to output files.
 */
describe("ATA schema generator integration", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await fs.mkdtemp(path.join(tmpdir(), "ata-gen-"));
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  it("should generate schema files from an OpenAPI document", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          Pet: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "integer" },
              vaccinated: { type: "boolean" },
            },
            required: ["name"],
          },
          Status: {
            type: "string",
            enum: ["active", "inactive"],
          },
        },
      },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    // Check schema directory was created
    const schemasDir = path.join(outputDir, "schemas");
    const files = await fs.readdir(schemasDir);

    // Should have Pet.ts, Pet.compiled.mjs, Status.ts, Status.compiled.mjs, runtime.ts, index.ts
    expect(files).toContain("Pet.ts");
    expect(files).toContain("Pet.compiled.mjs");
    expect(files).toContain("Status.ts");
    expect(files).toContain("Status.compiled.mjs");
    expect(files).toContain("runtime.ts");
    expect(files).toContain("index.ts");
  });

  it("should generate a valid index.ts that re-exports schemas", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          Widget: {
            type: "object",
            properties: { label: { type: "string" } },
          },
        },
      },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    const indexContent = await fs.readFile(
      path.join(outputDir, "schemas", "index.ts"),
      "utf-8",
    );
    expect(indexContent).toContain("Widget");
  });

  it("should generate runtime.ts helpers file", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: { schemas: {} },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    const runtimeContent = await fs.readFile(
      path.join(outputDir, "schemas", "runtime.ts"),
      "utf-8",
    );
    expect(runtimeContent).toContain("createStandardSchema");
    expect(runtimeContent).toContain("createObjectStandardSchema");
    expect(runtimeContent).toContain("StandardSchemaV1");
  });

  it("should handle schemas with $ref references", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          Address: {
            type: "object",
            properties: {
              city: { type: "string" },
              zip: { type: "string" },
            },
          },
          Person: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
            },
          },
        },
      },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    const schemasDir = path.join(outputDir, "schemas");
    const files = await fs.readdir(schemasDir);
    expect(files).toContain("Person.ts");
    expect(files).toContain("Address.ts");
  });

  it("should apply strict extraProps mode", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          Item: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        },
      },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "strict");

    const compiled = await fs.readFile(
      path.join(outputDir, "schemas", "Item.compiled.mjs"),
      "utf-8",
    );
    /* Strict mode should produce a validator that checks for extra keys */
    expect(compiled).toContain("validate");
  });

  it("should generate Standard Schema V1 adapter in each schema file", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          Token: { type: "string", format: "uuid" },
        },
      },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    const tokenContent = await fs.readFile(
      path.join(outputDir, "schemas", "Token.ts"),
      "utf-8",
    );
    expect(tokenContent).toContain('"~standard"');
    expect(tokenContent).toContain("version: 1");
    expect(tokenContent).toContain('vendor: "ata-validator"');
    expect(tokenContent).toContain("validate(value: unknown)");
  });

  it("should generate parameter schema files for operations", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/items/{id}": {
          get: {
            operationId: "getItem",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
              {
                name: "filter",
                in: "query",
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: { name: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: {} },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    const schemasDir = path.join(outputDir, "schemas");
    const files = await fs.readdir(schemasDir);
    expect(files).toContain("getItemParameters.ts");

    const paramContent = await fs.readFile(
      path.join(schemasDir, "getItemParameters.ts"),
      "utf-8",
    );
    expect(paramContent).toContain("getItemQuerySchema");
    expect(paramContent).toContain("getItemPathSchema");
    expect(paramContent).toContain("StandardSchemaV1");
  });

  it("should generate compiled .mjs with valid ESM exports", async () => {
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          Simple: { type: "string" },
        },
      },
    };

    await generateAtaSchemas(openApiDoc as never, outputDir, 4, "loose");

    const compiled = await fs.readFile(
      path.join(outputDir, "schemas", "Simple.compiled.mjs"),
      "utf-8",
    );
    /* Should have ESM export statements */
    expect(compiled).toMatch(/export\s/);
    expect(compiled).toContain("validate");
    expect(compiled).toContain("isValid");
  });
});
