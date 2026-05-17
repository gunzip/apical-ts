import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generate } from "../../src/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const inputSchema = join(__dirname, "fixtures/raw-json-schema.yaml");
const outputDir = join(__dirname, "../../tmp/raw-json-schema");

describe("raw JSON Schema input", () => {
  beforeEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  it("generates schemas from raw JSON Schema input", async () => {
    await generate({
      generateClient: false,
      generateRoutes: false,
      generateServer: false,
      input: inputSchema,
      output: outputDir,
    });

    const schemasDir = join(outputDir, "schemas");
    const generatedFiles = await fs.readdir(schemasDir);
    const personSchemaPath = join(schemasDir, "Person.ts");
    const indexPath = join(schemasDir, "index.ts");
    const personContent = await fs.readFile(personSchemaPath, "utf-8");
    const indexContent = await fs.readFile(indexPath, "utf-8");

    expect(generatedFiles).toEqual(
      expect.arrayContaining([
        "Address.ts",
        "Country.ts",
        "Person.ts",
        "index.ts",
      ]),
    );
    expect(personContent).toContain('import { Address } from "./Address.ts";');
    expect(personContent).toContain('"address": Address');
    expect(indexContent).toContain('import { Person } from "./Person.ts";');
    expect(indexContent).toContain("  Person,");
  });

  it("rejects client, routes, and server generation for raw JSON Schema input", async () => {
    await expect(
      generate({
        generateClient: true,
        generateRoutes: true,
        generateServer: true,
        input: inputSchema,
        output: outputDir,
      }),
    ).rejects.toThrow(
      "Raw JSON Schema input supports schema generation only. Remove --client, --server, and --routes, or convert the document to OpenAPI first.",
    );
  });
});
