import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generate } from "../src/core-generator/index.js";
import type { TransformContext } from "../src/core-generator/index.js";

describe("Request/Response Zod Transform Integration", () => {
  const outputDir = "./tests/integrations/generated-req-res-transform-test";

  beforeAll(async () => {
    /* Clean up any existing output */
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (e) {
      /* Ignore errors if directory doesn't exist */
    }
  });

  it("should apply transform to request schemas", async () => {
    /* Define a transform that adds a default value to request schemas */
    const zodTransform = (schema: any, ctx: TransformContext) => {
      if (
        ctx.kind === "requestBody" &&
        ctx.operationId === "testInlineBodySchema"
      ) {
        /* Add a default value */
        return schema.default({ name: "default-name-inline-body" });
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

    /* Check that the request schema was generated with transform */
    const requestSchemaPath = path.join(
      outputDir,
      "schemas",
      "TestInlineBodySchemaRequest.ts",
    );
    const requestSchema = await fs.readFile(requestSchemaPath, "utf-8");

    /* Verify that the default was added */
    expect(requestSchema).toContain("TestInlineBodySchemaRequest");
    expect(requestSchema).toContain(".default(");
    expect(requestSchema).toContain("default-name-inline-body");
  });

  it("should apply transform to response schemas", async () => {
    /* Define a transform that adds a default value to a specific response schema */
    const zodTransform = (schema: any, ctx: TransformContext) => {
      if (
        ctx.kind === "response" &&
        ctx.operationId === "testAuthBearerHttp" &&
        ctx.statusCode === "503"
      ) {
        /* Add default value */
        return schema.default({
          prop1: { id: "default-id" },
          prop2: "default-prop2",
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

    /* Check that the specific response schema was generated */
    const responseSchemaPath = path.join(
      outputDir,
      "schemas",
      "TestAuthBearerHttp503Response.ts",
    );
    const responseSchema = await fs.readFile(responseSchemaPath, "utf-8");

    /* Verify that the default was added */
    expect(responseSchema).toContain("TestAuthBearerHttp503Response");
    expect(responseSchema).toContain(".default(");
    expect(responseSchema).toContain("default-id");
  });
});
