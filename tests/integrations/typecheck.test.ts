import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve paths relative to this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const generatedDir = join(__dirname, "generated");
const operationsIndex = join(generatedDir, "operations", "index.ts");
const tsconfigPath = join(__dirname, "tsconfig.typecheck.json");

describe("generated client typecheck", () => {
  it("should compile with tsc (noEmit) without type errors", () => {
    // If the generated client is missing, attempt generation
    if (!existsSync(operationsIndex)) {
      const specPath = join(__dirname, "fixtures", "test.yaml");
      const resultGen = spawnSync(
        "pnpm",
        [
          "start",
          "generate",
          "-i",
          specPath,
          "-o",
          generatedDir,
          "--generate-client",
        ],
        { encoding: "utf-8" },
      );

      expect(resultGen.status).toBe(0);
    }

    // Sanity check that generation produced expected entrypoint
    expect(existsSync(operationsIndex)).toBe(true);

    const result = spawnSync(
      "pnpm",
      ["exec", "tsc", "-p", tsconfigPath, "--pretty", "false"],
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
  });
});
