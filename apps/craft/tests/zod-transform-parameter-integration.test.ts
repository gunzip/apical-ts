import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generate } from "../src/core-generator/index.js";
import type { TransformContext } from "../src/core-generator/index.js";

describe("Parameter Zod Transform Integration", () => {
  const outputDir = "./tests/integrations/generated-param-transform-test";

  beforeAll(async () => {
    /* Clean up any existing output */
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (e) {
      /* Ignore errors if directory doesn't exist */
    }
  });

  it("should apply transform to parameter schemas (testQueryParamInlineEnum)", async () => {
    /* Define a transform that adds a default value to the query parameter schema */
    const zodTransform = (schema: any, ctx: TransformContext) => {
      if (ctx.exportName === "testQueryParamInlineEnumQuerySchema") {
        /* Add default value to the query schema */
        return schema.default({
          "fields[catalog-item-bulk-create-job]": ["created_at"],
        });
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

    /* Check that the testQueryParamInlineEnum parameter schema was generated */
    const paramSchemaPath = path.join(
      outputDir,
      "schemas",
      "testQueryParamInlineEnumParameters.ts",
    );
    const paramSchema = await fs.readFile(paramSchemaPath, "utf-8");

    /* Verify that the default was added to the query schema */
    expect(paramSchema).toContain("testQueryParamInlineEnumQuerySchema");
    expect(paramSchema).toContain(".default(");
    expect(paramSchema).toContain("created_at");

    /* Verify the path and headers schemas were not transformed */
    expect(paramSchema).toContain("testQueryParamInlineEnumPathSchema");
    expect(paramSchema).toContain("testQueryParamInlineEnumHeadersSchema");
  });
});
