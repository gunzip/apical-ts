import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Integration test for --force-validation CLI flag
 * Tests that the generated code has the correct structure and behavior differences
 * when force-validation is enabled vs disabled
 */

describe("Force Validation CLI Flag Integration Test", () => {
  const generatedDir = "tests/integrations/generated";
  const forceValidationDir = "tests/integrations/generated-force-validation";

  it("should generate different return types for force-validation vs manual validation", () => {
    const manualOperationPath = join(generatedDir, "client/testDeserialization.ts");
    const forceValidationOperationPath = join(forceValidationDir, "client/testDeserialization.ts");

    const manualOperationContent = readFileSync(manualOperationPath, "utf-8");
    const forceValidationOperationContent = readFileSync(forceValidationOperationPath, "utf-8");

    // Manual validation should use ApiResponseWithParse
    expect(manualOperationContent).toContain("ApiResponseWithParse<200, typeof TestDeserializationResponseMap>");

    // Force validation should use ApiResponseWithForcedParse
    expect(forceValidationOperationContent).toContain("ApiResponseWithForcedParse<200, typeof TestDeserializationResponseMap>");

    // Manual validation should have parse() method
    expect(manualOperationContent).toContain("parse: () =>");

    // Force validation should have parsed field assignment
    expect(forceValidationOperationContent).toContain("const parsed =");
    expect(forceValidationOperationContent).toContain("parsed };");

    // Force validation should not have parse() method
    expect(forceValidationOperationContent).not.toContain("parse: () =>");
  });

  it("should generate correct response handler logic for force validation", () => {
    const forceValidationOperationPath = join(forceValidationDir, "client/testDeserialization.ts");
    const forceValidationOperationContent = readFileSync(forceValidationOperationPath, "utf-8");

    // Should automatically call parseApiResponseUnknownData
    expect(forceValidationOperationContent).toContain("const parsed = parseApiResponseUnknownData(");

    // Should return parsed field in response
    expect(forceValidationOperationContent).toContain("return { status: 200 as const, data, response, parsed };");
  });

  it("should import ApiResponseWithForcedParse in force validation client", () => {
    const forceValidationOperationPath = join(forceValidationDir, "client/testDeserialization.ts");
    const forceValidationOperationContent = readFileSync(forceValidationOperationPath, "utf-8");

    // Should import ApiResponseWithForcedParse
    expect(forceValidationOperationContent).toContain("ApiResponseWithForcedParse");
  });

  it("should not import ApiResponseWithParse in force validation client", () => {
    const forceValidationOperationPath = join(forceValidationDir, "client/testDeserialization.ts");
    const forceValidationOperationContent = readFileSync(forceValidationOperationPath, "utf-8");

    // Should not import ApiResponseWithParse
    expect(forceValidationOperationContent).not.toContain("ApiResponseWithParse");
  });

  it("should generate consistent response map structure", () => {
    const manualOperationPath = join(generatedDir, "client/testDeserialization.ts");
    const forceValidationOperationPath = join(forceValidationDir, "client/testDeserialization.ts");

    const manualOperationContent = readFileSync(manualOperationPath, "utf-8");
    const forceValidationOperationContent = readFileSync(forceValidationOperationPath, "utf-8");

    // Both should have the same response map structure
    expect(manualOperationContent).toContain("export const TestDeserializationResponseMap = {");
    expect(forceValidationOperationContent).toContain("export const TestDeserializationResponseMap = {");

    expect(manualOperationContent).toContain('"200": {');
    expect(forceValidationOperationContent).toContain('"200": {');

    expect(manualOperationContent).toContain('"application/json": TestDeserUser');
    expect(forceValidationOperationContent).toContain('"application/json": TestDeserUser');
  });

  it("should generate correct config imports for force validation", () => {
    const manualConfigPath = join(generatedDir, "client/config.ts");
    const forceValidationConfigPath = join(forceValidationDir, "client/config.ts");

    const manualConfigContent = readFileSync(manualConfigPath, "utf-8");
    const forceValidationConfigContent = readFileSync(forceValidationConfigPath, "utf-8");

    // Both should have ApiResponseWithParse
    expect(manualConfigContent).toContain("export type ApiResponseWithParse<");
    expect(forceValidationConfigContent).toContain("export type ApiResponseWithParse<");

    // Both should have ApiResponseWithForcedParse
    expect(manualConfigContent).toContain("export type ApiResponseWithForcedParse<");
    expect(forceValidationConfigContent).toContain("export type ApiResponseWithForcedParse<");
  });

  it("should work with multi-content-type operations", () => {
    const manualMultiContentPath = join(generatedDir, "client/testMultiContentTypes.ts");
    const forceValidationMultiContentPath = join(forceValidationDir, "client/testMultiContentTypes.ts");

    const manualMultiContentContent = readFileSync(manualMultiContentPath, "utf-8");
    const forceValidationMultiContentContent = readFileSync(forceValidationMultiContentPath, "utf-8");

    // Manual validation should have parse() method
    expect(manualMultiContentContent).toContain("parse: () =>");

    // Force validation should have parsed field
    expect(forceValidationMultiContentContent).toContain("const parsed =");
    expect(forceValidationMultiContentContent).toContain("parsed };");

    // Both should have the same response map
    expect(manualMultiContentContent).toContain("TestMultiContentTypesResponseMap");
    expect(forceValidationMultiContentContent).toContain("TestMultiContentTypesResponseMap");
  });

  it("should handle operations without response schemas", () => {
    const manualSimplePath = join(generatedDir, "client/testWithEmptyResponse.ts");
    const forceValidationSimplePath = join(forceValidationDir, "client/testWithEmptyResponse.ts");

    const manualSimpleContent = readFileSync(manualSimplePath, "utf-8");
    const forceValidationSimpleContent = readFileSync(forceValidationSimplePath, "utf-8");

    // Both should handle void responses correctly
    expect(manualSimpleContent).toContain("ApiResponse<200, void>");
    expect(forceValidationSimpleContent).toContain("ApiResponse<200, void>");

    // Operations without schemas should not have parse methods or parsed fields
    expect(manualSimpleContent).not.toContain("parse: () =>");
    expect(forceValidationSimpleContent).not.toContain("const parsed =");
    
    // Both should return simple response structure
    expect(manualSimpleContent).toContain("return { status: 200 as const, data: undefined, response };");
    expect(forceValidationSimpleContent).toContain("return { status: 200 as const, data: undefined, response };");
  });
});
