import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseFormatOverrideArguments } from "../../src/format-overrides.js";
import { generate } from "../../src/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const craftRoot = resolve(__dirname, "../..");
const inputSpec = join(__dirname, "fixtures/format-overrides.yaml");
const outputDir = join(__dirname, "../../tmp/embedded-generation");

describe("embedded generation and --clean integration", () => {
  beforeEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  it("omits package.json and tsconfig.json when emitPackageFiles is false", async () => {
    await generate({
      emitPackageFiles: false,
      generateClient: true,
      generateRoutes: true,
      generateServer: true,
      input: inputSpec,
      output: outputDir,
    });

    await expect(
      fs.access(join(outputDir, "standard-schema.ts")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(outputDir, "schemas/index.ts")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(outputDir, "routes/index.ts")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(outputDir, "client/index.ts")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(join(outputDir, "server/index.ts")),
    ).resolves.toBeUndefined();

    await expect(fs.access(join(outputDir, "package.json"))).rejects.toThrow();
    await expect(fs.access(join(outputDir, "tsconfig.json"))).rejects.toThrow();
  });

  it("rewrites all relative import specifiers to .js with --import-extension js", async () => {
    const cliResult = spawnSync(
      process.execPath,
      [
        join(craftRoot, "dist/index.mjs"),
        "generate",
        "-i",
        inputSpec,
        "-o",
        outputDir,
        "--client",
        "--server",
        "--routes",
        "--no-package-files",
        "--import-extension",
        "js",
        "--format",
        "tax-code=./tests/integrations/fixtures/format-overrides/TaxCode.ts",
      ],
      {
        cwd: craftRoot,
        encoding: "utf-8",
      },
    );

    expect(cliResult.status).toBe(0);

    const files = await collectTypeScriptFiles(outputDir);
    const relativeSpecifiers = await extractRelativeSpecifiers(files);

    expect(relativeSpecifiers.length).toBeGreaterThan(0);
    for (const specifier of relativeSpecifiers) {
      expect(specifier.endsWith(".js")).toBe(true);
      expect(specifier.endsWith(".ts")).toBe(false);
    }
  });

  it("emits extensionless relative specifiers with importExtension 'none'", async () => {
    await generate({
      emitPackageFiles: false,
      formatOverrides: parseFormatOverrideArguments(
        ["tax-code=./tests/integrations/fixtures/format-overrides/TaxCode.ts"],
        craftRoot,
      ),
      generateClient: true,
      generateRoutes: true,
      generateServer: true,
      importExtension: "none",
      input: inputSpec,
      output: outputDir,
    });

    const files = await collectTypeScriptFiles(outputDir);
    const relativeSpecifiers = await extractRelativeSpecifiers(files);

    expect(relativeSpecifiers.length).toBeGreaterThan(0);
    for (const specifier of relativeSpecifiers) {
      expect(specifier.endsWith(".ts")).toBe(false);
      expect(specifier.endsWith(".js")).toBe(false);
    }
  });

  it("cleans stale generated files while preserving unrelated files in output", async () => {
    await fs.mkdir(join(outputDir, "schemas"), { recursive: true });
    await fs.mkdir(join(outputDir, "routes"), { recursive: true });
    await fs.mkdir(join(outputDir, "client"), { recursive: true });
    await fs.mkdir(join(outputDir, "server"), { recursive: true });
    await fs.writeFile(join(outputDir, "schemas/stale.ts"), "// stale");
    await fs.writeFile(join(outputDir, "routes/stale.ts"), "// stale");
    await fs.writeFile(join(outputDir, "client/stale.ts"), "// stale");
    await fs.writeFile(join(outputDir, "server/stale.ts"), "// stale");
    await fs.writeFile(join(outputDir, "custom-host-file.ts"), "// keep me");
    await fs.writeFile(
      join(outputDir, "package.json"),
      '{"name":"host-app"}\n',
    );

    await generate({
      clean: true,
      emitPackageFiles: false,
      generateClient: true,
      generateRoutes: true,
      generateServer: true,
      input: inputSpec,
      output: outputDir,
    });

    await expect(
      fs.access(join(outputDir, "schemas/stale.ts")),
    ).rejects.toThrow();
    await expect(
      fs.access(join(outputDir, "routes/stale.ts")),
    ).rejects.toThrow();
    await expect(
      fs.access(join(outputDir, "client/stale.ts")),
    ).rejects.toThrow();
    await expect(
      fs.access(join(outputDir, "server/stale.ts")),
    ).rejects.toThrow();

    expect(
      await fs.readFile(join(outputDir, "custom-host-file.ts"), "utf-8"),
    ).toBe("// keep me");
    expect(await fs.readFile(join(outputDir, "package.json"), "utf-8")).toBe(
      '{"name":"host-app"}\n',
    );
  });

  it("rejects invalid --import-extension values via CLI", () => {
    const cliResult = spawnSync(
      process.execPath,
      [
        join(craftRoot, "dist/index.mjs"),
        "generate",
        "-i",
        inputSpec,
        "-o",
        outputDir,
        "--import-extension",
        "mjs",
      ],
      {
        cwd: craftRoot,
        encoding: "utf-8",
      },
    );

    expect(cliResult.status).toBe(1);
    expect(cliResult.stderr).toContain(
      'Invalid --import-extension value "mjs"',
    );
  });
});

async function collectTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTypeScriptFiles(fullPath)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function extractRelativeSpecifiers(
  files: readonly string[],
): Promise<string[]> {
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\()["'](\.[^"']+)["']/gu;

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    for (const match of content.matchAll(pattern)) {
      if (match[1]) {
        specifiers.push(match[1]);
      }
    }
  }

  return specifiers;
}
