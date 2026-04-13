import { promises as fs } from "fs";
import path from "path";

const tsConfigContent = {
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
};

/**
 * Creates the package metadata files for the generated output
 */
export async function createPackageJson(output: string): Promise<void> {
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
      JSON.stringify(tsConfigContent, null, 2),
    ),
  ]);
}
