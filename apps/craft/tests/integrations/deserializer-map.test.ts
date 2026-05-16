import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";

/*
 * Integration test for deserializers refactoring.
 * Tests that the generated code works correctly with the new deserializers functionality.
 * Uses the client already generated in integration test setup.
 */

describe("DeserializerMap Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should generate GlobalConfig with deserializers property", async () => {
    const configPath = join(generatedDir, "client/runtime.ts");
    const configContent = await readFile(configPath, "utf-8");

    expect(configContent).toContain("export interface GlobalConfig");
    expect(configContent).toContain("deserializers?: DeserializerMap;");
  });

  it("should generate operation with parse method that uses only config.deserializers", async () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
    const operationContent = await readFile(operationPath, "utf-8");

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

  it("should generate correct content-type indexed deserializer map types", async () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
    const operationContent = await readFile(operationPath, "utf-8");

    /* Find the deserializer map type definition */
    const deserializerMapMatch = operationContent.match(
      /export type TestAuthBearerHttpResponseDeserializerMap = Partial<\s*Record<\s*([\s\S]*?),\s*import\('\.\/runtime\.js'\)\.Deserializer\s*>\s*>;/,
    );

    expect(deserializerMapMatch).toBeTruthy();

    if (deserializerMapMatch) {
      const typeDefinition = deserializerMapMatch[1];

      /* Should extract content types from the nested response map */
      expect(typeDefinition).toContain(
        "[Status in keyof TestAuthBearerHttpResponseMap]: keyof TestAuthBearerHttpResponseMap[Status]",
      );
      expect(typeDefinition).toContain("[keyof TestAuthBearerHttpResponseMap]");

      /* Should not directly use status codes as keys */
      expect(typeDefinition).not.toContain(
        "keyof TestAuthBearerHttpResponseMap,",
      );
    }
  });

  it("should generate operation that imports and uses the correct types", async () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
    const operationContent = await readFile(operationPath, "utf-8");

    /* Should import GlobalConfig and parseApiResponseUnknownData */
    expect(operationContent).toContain("import {");
    expect(operationContent).toContain("GlobalConfig");
    expect(operationContent).toContain("parseApiResponseUnknownData");

    /* Operation function should accept GlobalConfig parameter */
    expect(operationContent).toContain("config: GlobalConfig & {");
  });

  it("should maintain response map structure for backward compatibility", async () => {
    const operationPath = join(generatedDir, "client/testAuthBearerHttp.ts");
    const operationContent = await readFile(operationPath, "utf-8");

    /* Response map should be re-exported from client */
    expect(operationContent).toContain(
      "export const TestAuthBearerHttpResponseMap",
    );

    /* Check that route is imported */
    expect(operationContent).toContain(
      'from "../routes/testAuthBearerHttp.js"',
    );

    /* Response map structure should be in route file */
    const routePath = join(generatedDir, "routes/testAuthBearerHttp.ts");
    const routeContent = await readFile(routePath, "utf-8");
    expect(routeContent).toContain('"503": {');
    expect(routeContent).toContain('"504": {');
    expect(routeContent).toContain('"application/json"');
    expect(routeContent).toContain('"application/problem+json"');
  });
});
