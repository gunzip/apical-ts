import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { StringFormatOverride } from "../src/schema-generator/format-overrides.js";

import { describe, expect, it } from "vitest";

import { createPackageFiles } from "../src/core-generator/package-generator.js";

describe("package generator", () => {
  it("uses plain tsgo for generated outputs at or below the chunking threshold", async () => {
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
          "@typescript/native-preview": "^7.0.0-dev",
        },
        name: "generated-client",
        scripts: {
          typecheck: "tsgo",
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

  it("writes typecheck.mjs for generated outputs above the chunking threshold", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "core-utils-package-"));
    const schemasDir = join(outputDir, "schemas");

    try {
      await mkdir(schemasDir, { recursive: true });
      await Promise.all(
        Array.from({ length: 1001 }, (_, index) =>
          writeFile(
            join(schemasDir, "Schema" + index + ".ts"),
            "export const schema" + index + " = " + index + ";\n",
          ),
        ),
      );

      await createPackageFiles(outputDir);

      const packageJson = JSON.parse(
        await readFile(join(outputDir, "package.json"), "utf8"),
      );
      const buildScript = await readFile(
        join(outputDir, "typecheck.mjs"),
        "utf8",
      );

      expect(packageJson.scripts.typecheck).toBe("node ./typecheck.mjs");
      expect(buildScript).toContain("APICAL_TS_BUILD_CHUNK_SIZE");
      expect(buildScript).toContain("[typecheck] ");
      expect(buildScript).toContain("chunk ");
      expect(buildScript).toContain("typecheck completed");
      expect(buildScript).toContain('return "../" + file;');
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
