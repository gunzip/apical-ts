import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { createPackageJson } from "../src/core-generator/package-generator.js";

describe("package generator", () => {
  it("writes package.json and tsconfig.json for generated output", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "core-utils-package-"));

    try {
      await createPackageJson(outputDir);

      const packageJson = JSON.parse(
        await readFile(join(outputDir, "package.json"), "utf8"),
      );
      const tsConfig = JSON.parse(
        await readFile(join(outputDir, "tsconfig.json"), "utf8"),
      );

      expect(packageJson).toMatchObject({
        dependencies: {
          zod: "^4.0.0",
        },
        devDependencies: {
          "@types/node": "^24.3.1",
          "@typescript/native-preview": "^7.0.0-dev",
        },
        name: "generated-client",
        scripts: {
          build: "tsgo",
        },
        type: "module",
        version: "0.1.0",
      });

      expect(tsConfig).toEqual({
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          lib: ["es2025"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmitOnError: false,
          outDir: "dist",
          resolveJsonModule: true,
          rootDir: ".",
          skipLibCheck: true,
          strict: true,
          target: "es2025",
          types: ["node"],
        },
      });
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
