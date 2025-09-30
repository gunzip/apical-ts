import { promises as fs } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { generate } from "../../src/core-generator/index.js";

const TMP_OUTPUT_DIR = "tests/integrations/tmp/extra-props";
const TEST_FIXTURE = "tests/integrations/fixtures/test.yaml";

/**
 * Integration tests for the --extra-props feature
 * Tests that the extraProps option correctly affects schema generation
 */
describe("Extra Props Feature Integration", () => {
  it("should generate .strict() for objects without additionalProperties when extraProps=strict", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "strict");
    await fs.mkdir(outputDir, { recursive: true });

    await generate({
      extraProps: "strict",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    // Check ObjectWithoutAdditionalProperties uses .strict()
    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithoutAdditionalProperties.ts"),
      "utf8",
    );

    expect(schemaContent).toContain(".strict()");
    expect(schemaContent).not.toContain(".loose()");
  });

  it("should generate .loose() for objects without additionalProperties when extraProps=loose", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "loose");
    await fs.mkdir(outputDir, { recursive: true });

    await generate({
      extraProps: "loose",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    // Check ObjectWithoutAdditionalProperties uses .loose()
    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithoutAdditionalProperties.ts"),
      "utf8",
    );

    expect(schemaContent).toContain(".loose()");
    expect(schemaContent).not.toContain(".strict()");
  });

  it("should not add modifiers for objects without additionalProperties when extraProps=strip", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "strip");
    await fs.mkdir(outputDir, { recursive: true });

    await generate({
      extraProps: "strip",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    // Check ObjectWithoutAdditionalProperties has no extra modifiers
    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithoutAdditionalProperties.ts"),
      "utf8",
    );

    expect(schemaContent).not.toContain(".loose()");
    expect(schemaContent).not.toContain(".strict()");
    expect(schemaContent).toContain("z.object({");
  });

  it("should respect explicit additionalProperties=false regardless of extraProps", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "explicit-false");
    await fs.mkdir(outputDir, { recursive: true });

    // Test with extraProps=loose, but additionalProperties=false should override
    await generate({
      extraProps: "loose",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithAdditionalPropertiesFalse.ts"),
      "utf8",
    );

    // Should use z.strictObject, NOT z.object().loose()
    expect(schemaContent).toContain("z.strictObject({");
    expect(schemaContent).not.toContain(".loose()");
  });

  it("should respect explicit additionalProperties=true regardless of extraProps", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "explicit-true");
    await fs.mkdir(outputDir, { recursive: true });

    // Test with extraProps=strict, but additionalProperties=true should override
    await generate({
      extraProps: "strict",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithAdditionalPropertiesTrue.ts"),
      "utf8",
    );

    // Should use z.object() without modifiers, NOT z.object().strict()
    expect(schemaContent).toContain("z.object({");
    expect(schemaContent).not.toContain(".strict()");
    expect(schemaContent).not.toContain(".loose()");
  });

  it("should respect explicit additionalProperties schema regardless of extraProps", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "explicit-schema");
    await fs.mkdir(outputDir, { recursive: true });

    await generate({
      extraProps: "strict",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithAdditionalPropertiesSchema.ts"),
      "utf8",
    );

    // Should use .catchall() with the schema, not .strict()
    expect(schemaContent).toContain(".catchall(z.string())");
    expect(schemaContent).not.toContain(".strict()");
    expect(schemaContent).not.toContain(".loose()");
  });

  it("should default to strip behavior when extraProps is not specified", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "default");
    await fs.mkdir(outputDir, { recursive: true });

    // Don't specify extraProps - should default to "strip"
    await generate({
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    const schemaContent = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithoutAdditionalProperties.ts"),
      "utf8",
    );

    // Should behave like strip - no extra modifiers
    expect(schemaContent).not.toContain(".loose()");
    expect(schemaContent).not.toContain(".strict()");
    expect(schemaContent).toContain("z.object({");
  });

  it("should use explicit additionalProperties values with extraProps=strip", async () => {
    const outputDir = join(TMP_OUTPUT_DIR, "strip-explicit");
    await fs.mkdir(outputDir, { recursive: true });

    await generate({
      extraProps: "strip",
      generateClient: false,
      input: TEST_FIXTURE,
      output: outputDir,
    });

    // additionalProperties=false should use z.strictObject
    const schemaFalse = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithAdditionalPropertiesFalse.ts"),
      "utf8",
    );
    expect(schemaFalse).toContain("z.strictObject({");
    expect(schemaFalse).not.toContain(".loose()");

    // additionalProperties=true should use z.object with .catchall(z.unknown())
    const schemaTrue = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithAdditionalPropertiesTrue.ts"),
      "utf8",
    );
    expect(schemaTrue).toContain("z.object({");
    expect(schemaTrue).toContain(".catchall(z.unknown())");
    expect(schemaTrue).not.toContain(".strict()");
    expect(schemaTrue).not.toContain(".loose()");

    // additionalProperties is a schema should use .catchall
    const schemaSchema = await fs.readFile(
      join(outputDir, "schemas", "ObjectWithAdditionalPropertiesSchema.ts"),
      "utf8",
    );
    expect(schemaSchema).toContain(".catchall(z.string())");
    expect(schemaSchema).not.toContain(".strict()");
    expect(schemaSchema).not.toContain(".loose()");
  });
});
