import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Integration test for content type discrimination with forced validation
 * Ensures the new parsed structure allows type discrimination based on contentType
 */

describe("Content Type Discrimination Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should generate parsed field with data and contentType structure for forced validation", () => {
    const operationPath = join(generatedDir, "client/testMultiContentTypes.ts");
    const content = readFileSync(operationPath, "utf-8");

    // Verify the new structure is generated
    expect(content).toContain(
      "parsed: { data: parseResult.parsed, contentType: parseResult.contentType }",
    );

    // Verify all 'parsed:' assignments use the new structure
    const parsedAssignments = Array.from(content.matchAll(/parsed:\s*({[^}]*})/g));
    for (const match of parsedAssignments) {
      expect(match[1]).toContain("data:");
      expect(match[1]).toContain("contentType:");
    }
  });

  it("should have correct TypeScript type for ApiResponseWithForcedParse", () => {
    const configPath = join(generatedDir, "client/config.ts");
    const content = readFileSync(configPath, "utf-8");

    // Verify the type definition includes the new structure
    expect(content).toContain("export type ApiResponseWithForcedParse<");
    expect(content).toContain("data: z.infer<");
    expect(content).toContain("contentType: K;");
  });

  it("should allow content type based discrimination in TypeScript", () => {
    // This test validates that the TypeScript types would work correctly
    // We're testing the generated types structure rather than runtime behavior
    const configPath = join(generatedDir, "client/config.ts");
    const operationPath = join(generatedDir, "client/testMultiContentTypes.ts");

    const configContent = readFileSync(configPath, "utf-8");
    const operationContent = readFileSync(operationPath, "utf-8");

    // Verify response map is properly typed for multi-content scenarios
    expect(operationContent).toContain("TestMultiContentTypesResponseMap");
    expect(operationContent).toContain('"application/json"');
    expect(operationContent).toContain('"application/vnd.custom+json"');
    expect(operationContent).toContain('"application/xml"');

    // Verify the forced parse type is used in the function signature
    expect(operationContent).toContain(
      "ApiResponseWithForcedParse<200, typeof TestMultiContentTypesResponseMap>",
    );
  });
});
