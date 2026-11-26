import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const craftRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface PackageManifest {
  exports?: Record<string, Record<string, string> | string>;
  types?: string;
}

function readManifest(): PackageManifest {
  return JSON.parse(
    readFileSync(resolve(craftRoot, "package.json"), "utf8"),
  ) as PackageManifest;
}

describe("craft published entry points", () => {
  it("points every exports condition at a file that exists", () => {
    const manifest = readManifest();
    const conditions = Object.entries(manifest.exports ?? {});

    expect(conditions.length).toBeGreaterThan(0);

    for (const [subpath, mapping] of conditions) {
      const targets =
        typeof mapping === "string" ? [mapping] : Object.values(mapping);

      for (const target of targets) {
        expect(
          existsSync(resolve(craftRoot, target)),
          `${subpath} targets missing file ${target}`,
        ).toBe(true);
      }
    }
  });

  it("ships type declarations that expose the generate API", () => {
    const manifest = readManifest();
    const generateEntry = manifest.exports?.["./generate"];
    const generateTypes =
      typeof generateEntry === "string" ? undefined : generateEntry?.types;

    expect(manifest.types).toBeDefined();
    expect(generateTypes).toBeDefined();

    const declarations = readFileSync(
      resolve(craftRoot, generateTypes as string),
      "utf8",
    );

    expect(declarations).toContain("export declare function generate");
    expect(declarations).toContain("interface GenerationOptions");
  });
});
