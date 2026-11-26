import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createCliProgram, getPackageVersion } from "../src/cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const craftRoot = resolve(__dirname, "..");

function readExpectedVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(resolve(craftRoot, "package.json"), "utf8"),
  ) as { version: string };
  return packageJson.version;
}

describe("craft CLI version", () => {
  it("reads the version dynamically from package.json", () => {
    const expectedVersion = readExpectedVersion();

    expect(getPackageVersion()).toBe(expectedVersion);
    expect(createCliProgram().version()).toBe(expectedVersion);
  });

  it("prints the package.json version when running --version", () => {
    const expectedVersion = readExpectedVersion();
    const binPath = resolve(craftRoot, "bin/craft.js");

    const output = execFileSync(process.execPath, [binPath, "--version"], {
      encoding: "utf8",
    }).trim();

    expect(output).toBe(expectedVersion);
  });
});
