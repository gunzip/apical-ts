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

const CHUNKED_BUILD_FILE_THRESHOLD = 1000;

const buildScriptContent = String.raw`import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CHUNK_SIZE = 100;
const root = dirname(fileURLToPath(import.meta.url));
const buildDir = join(root, ".apical-ts-build");
const distDir = join(root, "dist");
const forwardedArgs = process.argv.slice(2);
const tsgoCommand =
  process.platform === "win32"
    ? "node_modules/.bin/tsgo.cmd"
    : "node_modules/.bin/tsgo";

function logBuild(message) {
  console.log("[build] " + message);
}

function readChunkSize() {
  const rawValue =
    process.env.APICAL_TS_BUILD_CHUNK_SIZE ?? String(DEFAULT_CHUNK_SIZE);
  const chunkSize = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error("APICAL_TS_BUILD_CHUNK_SIZE must be a positive integer");
  }

  return chunkSize;
}

function listTypeScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".apical-ts-build"
    ) {
      continue;
    }

    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(relative(root, fullPath).split(sep).join("/"));
    }
  }

  return files;
}

function runTsgo(configPath) {
  const result = spawnSync(tsgoCommand, ["-p", configPath, ...forwardedArgs], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return {
    code: result.status ?? 1,
    signal: result.signal,
  };
}

function toBuildConfigFilePath(file) {
  return "../" + file;
}

function isIndexFile(file) {
  return file === "index.ts" || file.endsWith("/index.ts");
}

function toOutputJavaScriptPath(file) {
  return join(distDir, file.replace(/\.ts$/, ".js"));
}

function stripIndexTypeScript(source) {
  return source
    .replace(/^\s*export\s+type\s+\{[^;]*\}\s+from\s+["'][^"']+["'];\s*$/gm, "")
    .replace(/\s+as const/g, "");
}

function emitIndexFile(file) {
  const outputPath = toOutputJavaScriptPath(file);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    stripIndexTypeScript(readFileSync(join(root, file), "utf8")),
  );
}

let configIndex = 0;

function writeBuildConfig(files) {
  const configPath = join(buildDir, "tsconfig." + configIndex + ".json");
  configIndex += 1;

  const config = {
    extends: "../tsconfig.json",
    files: files.map(toBuildConfigFilePath),
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2));

  return configPath;
}

function compileFiles(files, label) {
  if (files.length === 0) {
    return 0;
  }

  const result = runTsgo(writeBuildConfig(files));
  if (result.code === 0) {
    return 0;
  }

  const signalSuffix = result.signal ? " (" + result.signal + ")" : "";

  if (files.length === 1) {
    console.error(
      "[build] " + label + ": tsgo failed for " + files[0] + signalSuffix,
    );
    return result.code;
  }

  const midpoint = Math.ceil(files.length / 2);
  logBuild(
    label +
      ": retrying in smaller chunks after failure" +
      signalSuffix +
      " (" +
      midpoint +
      " + " +
      (files.length - midpoint) +
      " files)",
  );
  const firstHalfResult = compileFiles(files.slice(0, midpoint), label + ".1");

  return firstHalfResult === 0
    ? compileFiles(files.slice(midpoint), label + ".2")
    : firstHalfResult;
}

const chunkSize = readChunkSize();
let exitCode = 0;

try {
  rmSync(buildDir, { force: true, recursive: true });
  rmSync(distDir, { force: true, recursive: true });
  mkdirSync(buildDir, { recursive: true });

  const files = listTypeScriptFiles(root).sort();
  const indexFiles = files.filter(isIndexFile);
  const compilationFiles = files.filter((file) => !isIndexFile(file));
  const totalChunks = Math.ceil(compilationFiles.length / chunkSize);

  logBuild(
    "compiling " +
      compilationFiles.length +
      " TypeScript files in " +
      totalChunks +
      " chunk(s) of up to " +
      chunkSize +
      " files",
  );

  for (let start = 0; start < compilationFiles.length; start += chunkSize) {
    const chunk = compilationFiles.slice(start, start + chunkSize);
    const chunkNumber = Math.floor(start / chunkSize) + 1;
    const chunkLabel = "chunk " + chunkNumber + "/" + totalChunks;

    logBuild(chunkLabel + ": compiling " + chunk.length + " file(s)");

    exitCode = compileFiles(chunk, chunkLabel);
    if (exitCode !== 0) {
      break;
    }
  }

  if (exitCode === 0) {
    logBuild("emitting " + indexFiles.length + " index file(s)");
    indexFiles.forEach(emitIndexFile);
    logBuild("build completed");
  }
} finally {
  rmSync(buildDir, { force: true, recursive: true });
}

process.exit(exitCode);
`;

async function countGeneratedTypeScriptFiles(
  directory: string,
): Promise<number> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".apical-ts-build"
    ) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      count += await countGeneratedTypeScriptFiles(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      count += 1;
    }
  }

  return count;
}

export async function createPackageFiles(
  output: string,
  formatOverrides: readonly StringFormatOverride[] = [],
): Promise<void> {
  const compilerOptions = { ...baseCompilerOptions };
  const generatedTypeScriptFileCount =
    await countGeneratedTypeScriptFiles(output);
  const useChunkedBuild =
    generatedTypeScriptFileCount > CHUNKED_BUILD_FILE_THRESHOLD;

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
      build: useChunkedBuild ? "node ./build.mjs" : "tsgo",
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
  ];

  if (useChunkedBuild) {
    packageFileWrites.push(
      fs.writeFile(path.join(output, "build.mjs"), buildScriptContent),
    );
  } else {
    packageFileWrites.push(
      fs.rm(path.join(output, "build.mjs"), { force: true }),
    );
  }

  await Promise.all(packageFileWrites);
}
