import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

describe("core-generator response reference resolution", () => {
  it("should generate response schemas for $ref responses using existing fixtures", async () => {
    // Using the existing test.yaml fixtures that already have $ref responses
    const schemasDir = path.join(
      process.cwd(),
      "tests/integrations/generated/schemas",
    );

    // Check that response schema files were generated for operations using $ref responses
    // This uses the test fixture testResponseRefWithInlineSchema which has:
    // responses: "200": $ref: "#/components/responses/InlineSchemaResponse"
    // where InlineSchemaResponse contains an inline schema
    const expectedFiles = ["TestResponseRefWithInlineSchema200Response.ts"];

    const existingFiles = await fs.readdir(schemasDir);

    for (const expectedFile of expectedFiles) {
      expect(existingFiles).toContain(expectedFile);

      // Verify the file content contains expected schema definitions
      const filePath = path.join(schemasDir, expectedFile);
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("export const");
      expect(content).toContain("export type");
      expect(content).toContain("TestResponseRefWithInlineSchema200Response");
    }
  });

  it("should have generated client imports for $ref response schemas", async () => {
    // Check that client files import the generated response schemas
    const clientDir = path.join(
      process.cwd(),
      "tests/integrations/generated/client",
    );

    const testFile = path.join(clientDir, "testResponseRefWithInlineSchema.ts");
    const testContent = await fs.readFile(testFile, "utf-8");

    expect(testContent).toContain(
      'import { TestResponseRefWithInlineSchema200Response } from "../schemas/TestResponseRefWithInlineSchema200Response.js"',
    );
  });

  it("should have generated server imports for $ref response schemas", async () => {
    // Check that server files import the generated response schemas
    const serverDir = path.join(
      process.cwd(),
      "tests/integrations/generated/server",
    );

    const testFile = path.join(serverDir, "testResponseRefWithInlineSchema.ts");
    const testContent = await fs.readFile(testFile, "utf-8");

    expect(testContent).toContain(
      'import { TestResponseRefWithInlineSchema200Response } from "../schemas/TestResponseRefWithInlineSchema200Response.js"',
    );
  });
});
