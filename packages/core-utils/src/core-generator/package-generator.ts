import { promises as fs } from "fs";
import path from "path";

import type { StringFormatOverride } from "../schema-generator/format-overrides.js";
import type { ValidatorBackend } from "../shared/types.js";

import { buildScriptContent } from "./build-script-template.js";
import { standardSchemaTemplateContent } from "./standard-schema-template.js";

const baseCompilerOptions: Record<string, unknown> = {
  noEmit: true,
  allowSyntheticDefaultImports: true,
  erasableSyntaxOnly: true,
  allowImportingTsExtensions: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  lib: ["es2024"],
  module: "NodeNext",
  moduleResolution: "NodeNext",
  resolveJsonModule: true,
  skipLibCheck: true,
  strict: true,
  target: "es2024",
  types: ["node"],
};

const CHUNKED_BUILD_FILE_THRESHOLD = 1000;

const GENERATED_DIRECTORIES = ["schemas", "client", "server", "routes"];

async function countTypeScriptFilesRecursive(
  directory: string,
): Promise<number> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      count += await countTypeScriptFilesRecursive(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      count += 1;
    }
  }

  return count;
}

async function countGeneratedTypeScriptFiles(
  directory: string,
): Promise<number> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || !GENERATED_DIRECTORIES.includes(entry.name)) {
      continue;
    }

    count += await countTypeScriptFilesRecursive(
      path.join(directory, entry.name),
    );
  }

  return count;
}

export async function createPackageFiles(
  output: string,
  formatOverrides: readonly StringFormatOverride[] = [],
  validator: ValidatorBackend = "zod",
): Promise<void> {
  const compilerOptions = { ...baseCompilerOptions };
  const generatedTypeScriptFileCount =
    await countGeneratedTypeScriptFiles(output);
  const useChunkedBuild =
    generatedTypeScriptFileCount > CHUNKED_BUILD_FILE_THRESHOLD;

  if (!formatOverrides.some((override) => override.import.kind === "path")) {
    compilerOptions.rootDir = ".";
  }

  /*
   * ATA validator output emits compiled validators as .mjs files (plain JS).
   * Allow importing them from .ts wrappers.
   */
  if (validator === "ata") {
    compilerOptions.allowJs = true;
  }
  const packageJsonContent = {
    dependencies:
      validator === "ata"
        ? { "@standard-schema/spec": "^1.0.0" }
        : { "@standard-schema/spec": "^1.0.0", zod: "^4.0.0" },
    devDependencies: {
      "@types/node": "^24.3.1",
      "@typescript/native-preview": "^7.0.0-dev",
    },
    name: "generated-client",
    scripts: {
      typecheck: useChunkedBuild ? "node ./typecheck.mjs" : "tsgo",
    },
    type: "module",
    version: "0.1.0",
  };

  const packageFileWrites = [
    fs.writeFile(
      path.join(output, "package.json"),
      JSON.stringify(packageJsonContent, null, 2),
    ),
    fs.writeFile(
      path.join(output, "tsconfig.json"),
      JSON.stringify({ compilerOptions }, null, 2),
    ),
    fs.writeFile(
      path.join(output, "standard-schema.ts"),
      standardSchemaTemplateContent,
    ),
  ];

  if (useChunkedBuild) {
    packageFileWrites.push(
      fs.writeFile(path.join(output, "typecheck.mjs"), buildScriptContent),
    );
  } else {
    packageFileWrites.push(
      fs.rm(path.join(output, "typecheck.mjs"), { force: true }),
    );
  }

  await Promise.all(packageFileWrites);
}
