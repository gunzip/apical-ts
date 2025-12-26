import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";

/*
 * Integration test for content type discrimination with forced validation
 * Ensures the new parsed structure allows type discrimination based on contentType
 */

describe("Content Type Discrimination Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should generate parsed field with data and contentType structure for forced validation", async () => {
    const operationPath = join(generatedDir, "client/testMultiContentTypes.ts");
    const content = await readFile(operationPath, "utf-8");

    // Verify the createForcedParseResponse helper is used
    expect(content).toContain(
      "const forcedResult = createForcedParseResponse(",
    );

    // Verify the helper function is imported
    expect(content).toContain("createForcedParseResponse");
  });

  it("should have correct TypeScript type for ApiResponseWithForcedParse", async () => {
    const configPath = join(generatedDir, "client/config.ts");
    const content = await readFile(configPath, "utf-8");

    // Verify the type definition includes the new structure
    expect(content).toContain("export type ApiResponseWithForcedParse<");
    expect(content).toContain("data: z.infer<");
    expect(content).toContain("contentType: K;");
  });

  it("should allow content type based discrimination in TypeScript", async () => {
    // This test validates that the TypeScript types would work correctly
    // We're testing the generated types structure rather than runtime behavior
    const configPath = join(generatedDir, "client/config.ts");
    const operationPath = join(generatedDir, "client/testMultiContentTypes.ts");

    const configContent = await readFile(configPath, "utf-8");
    const operationContent = await readFile(operationPath, "utf-8");

    // Verify response map is properly typed for multi-content scenarios
    expect(operationContent).toContain("TestMultiContentTypesResponseMap");
    expect(operationContent).toContain('"application/json"');
    expect(operationContent).toContain('"application/vnd.custom+json"');
    expect(operationContent).toContain('"application/xml"');

    // Verify the forced parse type is used in the function signature
    expect(operationContent).toContain(
      'ApiResponseWithForcedParse<"200", typeof TestMultiContentTypesResponseMap>',
    );
  });
});
