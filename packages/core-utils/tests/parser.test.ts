import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  hasExternalRefPointers,
  parseOpenAPI,
  parseOpenAPIDocument,
} from "../src/core-generator/parser.js";

describe("OpenAPI parser", () => {
  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("parses internal-only documents without flagging external refs", async () => {
    const specPath = fileURLToPath(
      new URL("./fixtures/internal-refs.yaml", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(hasExternalRefPointers(parsed)).toBe(false);

    const openApiDoc = await parseOpenAPI(specPath);
    expect(openApiDoc.openapi).toBe("3.1.0");

    const userSchema = openApiDoc.components?.schemas?.User;
    expect(userSchema).toBeDefined();
    if (!userSchema || "$ref" in userSchema) {
      expect.fail("Expected User to be emitted as a schema object");
    }

    expect(userSchema.properties?.address).toEqual({
      $ref: "#/components/schemas/Address",
    });
    expect(userSchema.properties?.name).toMatchObject({
      type: ["string", "null"],
    });
  });

  it("detects external ref pointers before bundling", async () => {
    const specPath = fileURLToPath(
      new URL("./fixtures/external-root.yaml", import.meta.url),
    );

    const parsed = await parseOpenAPIDocument(specPath);
    expect(hasExternalRefPointers(parsed)).toBe(true);
  });
});
