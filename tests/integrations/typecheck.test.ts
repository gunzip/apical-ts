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
const serverOperationsIndex = join(
  generatedDir,
  "server-operations",
  "index.ts",
);
const tsconfigPath = join(__dirname, "tsconfig.typecheck.json");

describe("generated client + server typecheck", () => {
  it("should compile with tsc (noEmit) without type errors", () => {
    // Ensure latest source changes are reflected in dist (server generator uses dist via CLI)
    const buildResult = spawnSync("pnpm", ["run", "build"], {
      encoding: "utf-8",
    });
    expect(buildResult.status).toBe(0);
    // Always regenerate to ensure templates and logic changes are reflected (avoid stale cached output)
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
        "--generate-server",
      ],
      { encoding: "utf-8" },
    );
    expect(resultGen.status).toBe(0);

    // Sanity checks that generation produced expected entrypoints
    expect(existsSync(operationsIndex)).toBe(true);
    expect(existsSync(serverOperationsIndex)).toBe(true);

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
