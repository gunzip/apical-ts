import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { StringFormatOverride } from "../src/schema-generator/format-overrides.js";

import { describe, expect, it } from "vitest";

import { createPackageFiles } from "../src/core-generator/package-generator.js";

describe("package generator", () => {
  it("uses tsrs to typecheck generated output", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "core-utils-package-"));

    try {
      await writeFile(join(outputDir, "typecheck.mjs"), "stale");
      await createPackageFiles(outputDir);

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
          tsrs: "^0.20.0-ts7.1.0-beta",
        },
        name: "generated-client",
        scripts: {
          typecheck: "tsrs",
        },
        type: "module",
        version: "0.1.0",
      });
      await expect(access(join(outputDir, "typecheck.mjs"))).rejects.toThrow();

      expect(tsConfig).toEqual({
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          allowImportingTsExtensions: true,
          erasableSyntaxOnly: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          lib: ["es2024"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          resolveJsonModule: true,
          rootDir: ".",
          skipLibCheck: true,
          strict: true,
          target: "es2024",
          types: ["node"],
        },
      });
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("omits rootDir when path-based format overrides are present", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "core-utils-package-"));
    const formatOverrides: StringFormatOverride[] = [
      {
        format: "tax-code",
        import: {
          kind: "path",
          path: "/tmp/TaxCode.ts",
        },
        importName: "TaxCode",
      },
    ];

    try {
      await createPackageFiles(outputDir, formatOverrides);

      const tsConfig = JSON.parse(
        await readFile(join(outputDir, "tsconfig.json"), "utf8"),
      );

      expect(tsConfig).toEqual({
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          allowImportingTsExtensions: true,
          erasableSyntaxOnly: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          lib: ["es2024"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          resolveJsonModule: true,
          skipLibCheck: true,
          strict: true,
          target: "es2024",
          types: ["node"],
        },
      });
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
