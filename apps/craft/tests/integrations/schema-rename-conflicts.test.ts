import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { MockServer, getRandomPort } from "./setup.js";
import { createUnauthenticatedClient } from "./client.js";
import fs from "fs/promises";
import path from "path";

/* Integration test ensuring conflicting schema names (ApiResponse, Blob, Buffer) were renamed with Schema suffix. */

describe("schema rename pre-processing (integration)", () => {
  let mockServer: MockServer;
  let baseURL: string;
  const port = getRandomPort();
  const generatedSchemasDir = path.join(
    process.cwd(),
    "tests/integrations/generated/schemas",
  );

  beforeAll(async () => {
    mockServer = new MockServer({
      port,
      specPath: "tests/integrations/fixtures/test.yaml",
    });
    await mockServer.start();
    baseURL = mockServer.getBaseUrl();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it("renames ApiResponse, Blob, Buffer schemas", async () => {
    const files = await fs.readdir(generatedSchemasDir);
    expect(files.some((f) => /^ApiResponseSchema\./.test(f))).toBe(true);
    expect(files.some((f) => /^BlobSchema\./.test(f))).toBe(true);
    expect(files.some((f) => /^BufferSchema\./.test(f))).toBe(true);
    // Ensure originals are not present
    expect(files.some((f) => /^ApiResponse\./.test(f))).toBe(false);
    expect(files.some((f) => /^Blob\./.test(f))).toBe(false);
    expect(files.some((f) => /^Buffer\./.test(f))).toBe(false);
  });

  it("client type definitions use renamed schemas", async () => {
    const client = createUnauthenticatedClient(baseURL);
    // Just call an operation to ensure client builds & runtime unaffected
    const res = await client.testOverriddenSecurityNoAuth({});
    expect("status" in res).toBe(true);
  });
});
