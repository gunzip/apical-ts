import { promises as fs } from "fs";
import path from "path";

import type { StringFormatOverride } from "../schema-generator/format-overrides.js";

const baseCompilerOptions: Record<string, unknown> = {
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  lib: ["es2024"],
  module: "NodeNext",
  moduleResolution: "NodeNext",
  noEmitOnError: false,
  outDir: "dist",
  resolveJsonModule: true,
  skipLibCheck: true,
  strict: true,
  target: "es2024",
  types: ["node"],
};

export async function createPackageFiles(
  output: string,
  formatOverrides: readonly StringFormatOverride[] = [],
): Promise<void> {
  const compilerOptions = { ...baseCompilerOptions };
  if (!formatOverrides.some((override) => override.import.kind === "path")) {
    compilerOptions.rootDir = ".";
  }
  const packageJsonContent = {
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
  };
  await Promise.all([
    fs.writeFile(
      path.join(output, "package.json"),
      JSON.stringify(packageJsonContent, null, 2),
    ),
    fs.writeFile(
      path.join(output, "tsconfig.json"),
      JSON.stringify({ compilerOptions }, null, 2),
    ),
  ]);
}
