import { promises as fs } from "fs";
import { join } from "path";
import { generate } from "../../src/generate.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Routes-only generation", () => {
  const inputSpec = join(__dirname, "../fixtures/test.yaml");
  const outputDir = join(__dirname, "../../tmp/routes-only");

  beforeEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  it("should generate schemas and routes without client or server code", async () => {
    await generate({
      input: inputSpec,
      output: outputDir,
      generateClient: false,
      generateRoutes: true,
      generateServer: false,
    });

    // Check schemas are generated
    const schemasDir = join(outputDir, "schemas");
    await expect(fs.stat(schemasDir)).resolves.toBeDefined();

    // Check routes are generated
    const routesDir = join(outputDir, "routes");
    await expect(fs.stat(routesDir)).resolves.toBeDefined();

    // Ensure no client operations
    const operationsDir = join(outputDir, "operations");
    await expect(fs.stat(operationsDir)).rejects.toThrow();

    // Ensure no server operations (assuming server dir is separate, e.g., "server")
    const serverDir = join(outputDir, "server");
    await expect(fs.stat(serverDir)).rejects.toThrow();
  });
});
