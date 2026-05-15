import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generate } from "../../src/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const inputSpec = join(__dirname, "fixtures/request-body-literal-ref.yaml");
const outputDir = join(__dirname, "../../tmp/request-body-literal-ref");

describe("request body preprocessing", () => {
  beforeEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  it("generates client code when a schema contains a literal $ref property", async () => {
    await generate({
      generateClient: true,
      input: inputSpec,
      output: outputDir,
    });

    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "JsonSchemaProps.ts"),
      "utf-8",
    );

    expect(schemaContent).toContain('"$ref": z.string()');
    await expect(
      fs.stat(join(outputDir, "schemas", "index.ts")),
    ).resolves.toBeDefined();
  });
});
