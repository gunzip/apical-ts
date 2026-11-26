import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const craftRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binPath = resolve(craftRoot, "bin/craft.js");

function runGenerateCli(args: string[]): { status: number; stderr: string } {
  try {
    execFileSync(process.execPath, [binPath, "generate", ...args], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return { status: 0, stderr: "" };
  } catch (error) {
    const failure = error as { status?: number; stderr?: string };
    return { status: failure.status ?? 1, stderr: failure.stderr ?? "" };
  }
}

describe("craft generate CLI options", () => {
  it("rejects an unsupported --extra-props value instead of silently defaulting", () => {
    const { status, stderr } = runGenerateCli([
      "-i",
      resolve(craftRoot, "tests/integrations/fixtures/test.yaml"),
      "-o",
      resolve(
        craftRoot,
        "tests/integrations/fixtures/.tmp-invalid-extra-props",
      ),
      "--extra-props",
      "bogus",
    ]);

    expect(status).not.toBe(0);
    expect(stderr).toContain("Allowed choices are strip, loose, strict");
  });
});
