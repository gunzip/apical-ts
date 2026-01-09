import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { access } from "fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve paths relative to this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const generatedDir = join(__dirname, "generated");
const operationsIndex = join(generatedDir, "client", "index.ts");
const serverOperationsIndex = join(generatedDir, "server", "index.ts");
const tsconfigPath = join(__dirname, "tsconfig.typecheck.json");

describe("generated client + server typecheck", () => {
  it("should compile with tsc (noEmit) without type errors", async () => {
    // Use pre-generated code for type checking
    // (Generation should be done separately via build/setup scripts)

    // Sanity checks that generation produced expected entrypoints
    await expect(async () => await access(operationsIndex)).not.toThrow();
    await expect(async () => await access(serverOperationsIndex)).not.toThrow();

    const result = spawnSync(
      "pnpm",
      ["exec", "tsgo", "-p", tsconfigPath, "--pretty", "false"],
      { encoding: "utf-8" },
    );

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    if (result.status !== 0) {
      // Provide helpful diagnostics if it fails
      console.error("Type checking failed. Stdout:\n", stdout);
      console.error("Stderr:\n", stderr);
    }

    expect(result.status).toBe(0);
    // Ensure no TS error diagnostics appeared
    expect(stdout + stderr).not.toMatch(/error TS\d{4}:/);
  }, 20_000); // Increase timeout for typecheck
});
