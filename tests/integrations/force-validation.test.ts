import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Integration test for --force-validation CLI flag
 * Tests that the generated code has the correct structure and behavior differences
 * when force-validation is enabled vs disabled
 */

describe("Dynamic Force Validation Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should contain both ApiResponseWithParse and ApiResponseWithForcedParse types in single generated client", () => {
    const configPath = join(generatedDir, "client/config.ts");
    const content = readFileSync(configPath, "utf-8");
    expect(content).toContain("export type ApiResponseWithParse<");
    expect(content).toContain("export type ApiResponseWithForcedParse<");
  });

  it("operation code should branch on config.forceValidation at runtime", () => {
    const operationPath = join(generatedDir, "client/testDeserialization.ts");
    const content = readFileSync(operationPath, "utf-8");
    // Single file must include both manual and forced validation logic
    expect(content).toContain("if (config.forceValidation)");
    expect(content).toContain("parsed: parseResult");
    expect(content).toContain("parse: () =>");
  });

  it("response map is defined once", () => {
    const operationPath = join(generatedDir, "client/testDeserialization.ts");
    const content = readFileSync(operationPath, "utf-8");
    expect(content).toContain(
      "export const TestDeserializationResponseMap = {",
    );
    expect(content).toContain('"200": {');
    expect(content).toContain('"application/json": TestDeserUser');
  });

  it("multi content type operation has both code paths", () => {
    const operationPath = join(generatedDir, "client/testMultiContentTypes.ts");
    const content = readFileSync(operationPath, "utf-8");
    expect(content).toContain("if (config.forceValidation)");
    expect(content).toContain("parsed: parseResult");
    expect(content).toContain("parse: () =>");
    expect(content).toContain("TestMultiContentTypesResponseMap");
  });

  it("void response operation omits parse logic altogether", () => {
    const operationPath = join(generatedDir, "client/testWithEmptyResponse.ts");
    const content = readFileSync(operationPath, "utf-8");
    expect(content).toContain("ApiResponse<200, void>");
    expect(content).not.toContain("parse: () =>");
    expect(content).not.toContain("parsed: parseResult");
  });
});
