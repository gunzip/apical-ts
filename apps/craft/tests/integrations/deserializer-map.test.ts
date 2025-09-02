import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Integration test for deserializers refactoring.
 * Tests that the generated code works correctly with the new deserializers functionality.
 * Uses the client already generated in integration test setup.
 */

describe("DeserializerMap Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should generate GlobalConfig with deserializers property", () => {
    const configPath = join(generatedDir, "client/config.ts");
    const configContent = readFileSync(configPath, "utf-8");

    expect(configContent).toContain("export interface GlobalConfig");
    expect(configContent).toContain("deserializers?: DeserializerMap;");
  });

  it("should generate operation with parse method that uses only config.deserializers", () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
    const operationContent = readFileSync(operationPath, "utf-8");

    /* Verify parse method takes no arguments */
    expect(operationContent).toContain("parse: ()");

    /* Verify parse method uses config.deserializers directly */
    expect(operationContent).toContain("config.deserializers");

    /* Should not have deserializers parameter */
    expect(operationContent).not.toContain("parse: (deserializers?:");

    /* Should not have the old fallback syntax */
    expect(operationContent).not.toContain(
      "deserializers || config.deserializers",
    );
  });

  it("should generate correct content-type indexed deserializer map types", () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
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
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
    const operationContent = readFileSync(operationPath, "utf-8");

    /* Should import GlobalConfig and parseApiResponseUnknownData */
    expect(operationContent).toContain("import {");
    expect(operationContent).toContain("GlobalConfig");
    expect(operationContent).toContain("parseApiResponseUnknownData");

    /* Operation function should accept GlobalConfig parameter */
    expect(operationContent).toContain("config: GlobalConfig & {");
  });

  it("should maintain response map structure for backward compatibility", () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
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
