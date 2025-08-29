import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Integration test for deserializerMap refactoring.
 * Tests that the generated code works correctly with the new deserializerMap functionality.
 */

describe("DeserializerMap Integration Test", () => {
  const testOutputDir = "/tmp/deserializer-map-integration-test";

  beforeAll(() => {
    /* Clean up and generate fresh client code */
    execSync(`rm -rf ${testOutputDir}`, { stdio: "ignore" });
    execSync(
      `pnpm start generate -i tests/integrations/fixtures/test.yaml -o ${testOutputDir} --generate-client`,
      {
        cwd: process.cwd(),
        stdio: "pipe",
      },
    );
  });

  it("should generate GlobalConfig with deserializerMap property", () => {
    const configPath = join(testOutputDir, "client/config.ts");
    const configContent = readFileSync(configPath, "utf-8");

    expect(configContent).toContain("export interface GlobalConfig");
    expect(configContent).toContain("deserializerMap?: DeserializerMap;");
  });

  it("should generate operation with parse method that uses config.deserializerMap as fallback", () => {
    const operationPath = join(testOutputDir, "client/testAuthBearerHttp.ts");
    const operationContent = readFileSync(operationPath, "utf-8");

    /* Verify parse method uses config.deserializerMap as fallback */
    expect(operationContent).toContain(
      "deserializerMap || config.deserializerMap",
    );

    /* Verify parse method still accepts optional deserializerMap parameter */
    expect(operationContent).toContain(
      "parse: (deserializerMap?: TestAuthBearerHttpResponseDeserializerMap)",
    );
  });

  it("should generate correct content-type indexed deserializer map types", () => {
    const operationPath = join(testOutputDir, "client/testAuthBearerHttp.ts");
    const operationContent = readFileSync(operationPath, "utf-8");

    /* Find the deserializer map type definition */
    const deserializerMapMatch = operationContent.match(
      /export type TestAuthBearerHttpResponseDeserializerMap = Partial<\s*Record<\s*([\s\S]*?),\s*import\("\.\/config\.js"\)\.Deserializer\s*>\s*>;/,
    );

    expect(deserializerMapMatch).toBeTruthy();

    if (deserializerMapMatch) {
      const typeDefinition = deserializerMapMatch[1];

      /* Should extract content types from the nested response map */
      expect(typeDefinition).toContain(
        "keyof (typeof TestAuthBearerHttpResponseMap)[Status]",
      );
      expect(typeDefinition).toContain(
        "[keyof typeof TestAuthBearerHttpResponseMap]",
      );

      /* Should not directly use status codes as keys */
      expect(typeDefinition).not.toContain(
        "keyof typeof TestAuthBearerHttpResponseMap,",
      );
    }
  });

  it("should generate operation that imports and uses the correct types", () => {
    const operationPath = join(testOutputDir, "client/testAuthBearerHttp.ts");
    const operationContent = readFileSync(operationPath, "utf-8");

    /* Should import GlobalConfig and parseApiResponseUnknownData */
    expect(operationContent).toContain("import {");
    expect(operationContent).toContain("GlobalConfig");
    expect(operationContent).toContain("parseApiResponseUnknownData");

    /* Operation function should accept GlobalConfig parameter */
    expect(operationContent).toContain("config: GlobalConfig = globalConfig");
  });

  it("should maintain response map structure for backward compatibility", () => {
    const operationPath = join(testOutputDir, "client/testAuthBearerHttp.ts");
    const operationContent = readFileSync(operationPath, "utf-8");

    /* Response map should still be indexed by status code first */
    expect(operationContent).toContain(
      "export const TestAuthBearerHttpResponseMap",
    );
    expect(operationContent).toContain('"503": {');
    expect(operationContent).toContain('"504": {');
    expect(operationContent).toContain('"application/json"');
    expect(operationContent).toContain('"application/problem+json"');
  });
});
