import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generate } from "../src/core-generator/index.js";
import type { TransformContext } from "../src/core-generator/index.js";

describe("Zod Transform Integration", () => {
  const outputDir = "./tests/integrations/generated-transform-test";

  beforeAll(async () => {
    /* Clean up any existing output */
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (e) {
      /* Ignore errors if directory doesn't exist */
    }
  });

  it("should apply transform to component schemas during generation", async () => {
    /* Define a transform that adds a default value to the SimpleDefinition schema */
    const zodTransform = (schema: any, ctx: TransformContext) => {
      if (ctx.componentName === "SimpleDefinition") {
        return schema.default({ id: "default-id" });
      }
      return schema;
    };

    /* Generate schemas with transform */
    await generate({
      input: "./tests/integrations/fixtures/test.yaml",
      output: outputDir,
      generateClient: false,
      zodTransform,
    });

    /* Check that the SimpleDefinition schema was generated */
    const schemaPath = path.join(outputDir, "schemas", "SimpleDefinition.ts");
    const schemaContent = await fs.readFile(schemaPath, "utf-8");

    /* Verify that the default was added */
    expect(schemaContent).toContain(".default(");
    expect(schemaContent).toContain("default-id");
  });
});
