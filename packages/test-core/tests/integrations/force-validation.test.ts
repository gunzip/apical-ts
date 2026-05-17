import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";

/*
 * Integration test for runtime forceValidation behavior
 * Ensures generated code contains both manual and automatic validation code paths
 */

describe("Dynamic Force Validation Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should contain both ApiResponseWithParse and ApiResponseWithForcedParse types in single generated client", async () => {
    const configPath = join(generatedDir, "client/runtime.ts");
    const content = await readFile(configPath, "utf-8");
    expect(content).toContain("export type ApiResponseWithParse<");
    expect(content).toContain("export type ApiResponseWithForcedParse<");
  });

  it("operation code should branch on config.forceValidation at runtime", async () => {
    const operationPath = join(generatedDir, "client/testDeserialization.ts");
    const content = await readFile(operationPath, "utf-8");
    // Single file must include both manual and forced validation logic
    expect(content).toContain("if (config.forceValidation)");
    expect(content).toContain(
      "const forcedResult = createForcedParseResponse(",
    );
    expect(content).toContain("parse: () =>");
  });

  it("response map is defined once", async () => {
    const operationPath = join(generatedDir, "client/testDeserialization.ts");
    const content = await readFile(operationPath, "utf-8");
    // Now we import from routes and re-export
    expect(content).toContain(
      "export const TestDeserializationResponseMap = testDeserializationResponseMap",
    );
    // Check that route is imported (includes clientRoute alias)
    expect(content).toContain('from "../routes/testDeserialization.ts"');
  });

  it("multi content type operation has both code paths", async () => {
    const operationPath = join(generatedDir, "client/testMultiContentTypes.ts");
    const content = await readFile(operationPath, "utf-8");
    expect(content).toContain("if (config.forceValidation)");
    expect(content).toContain(
      "const forcedResult = createForcedParseResponse(",
    );
    expect(content).toContain("parse: () =>");
    expect(content).toContain("TestMultiContentTypesResponseMap");
  });

  it("void response operation omits parse logic altogether", async () => {
    // Use an operation that has only void responses without schemas
    const operationPath = join(generatedDir, "client/testSimplePatch.ts");
    const content = await readFile(operationPath, "utf-8");
    expect(content).toContain('ApiResponse<"200", void>');
    expect(content).not.toContain("parse: () =>");
    expect(content).not.toContain("parsed: parseResult");
  });
});
