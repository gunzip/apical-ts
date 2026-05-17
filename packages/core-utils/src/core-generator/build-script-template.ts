export const buildScriptContent = String.raw`import { spawnSync } from "node:child_process";
import {
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CHUNK_SIZE = 100;
const root = dirname(fileURLToPath(import.meta.url));
const buildDir = join(root, ".apical-ts-build");
const forwardedArgs = process.argv.slice(2);
const tsgoCommand =
  process.platform === "win32"
    ? "node_modules/.bin/tsgo.cmd"
    : "node_modules/.bin/tsgo";

function logBuild(message) {
  console.log("[typecheck] " + message);
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
  const result = spawnSync(
    tsgoCommand,
    ["--noEmit", "-p", configPath, ...forwardedArgs],
    {
      cwd: root,
      stdio: "inherit",
    },
  );

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
      "[typecheck] " + label + ": tsgo failed for " + files[0] + signalSuffix,
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
  mkdirSync(buildDir, { recursive: true });

  const files = listTypeScriptFiles(root).sort();
  const totalChunks = Math.ceil(files.length / chunkSize);

  logBuild(
    "typechecking " +
      files.length +
      " TypeScript files in " +
      totalChunks +
      " chunk(s) of up to " +
      chunkSize +
      " files",
  );

  for (let start = 0; start < files.length; start += chunkSize) {
    const chunk = files.slice(start, start + chunkSize);
    const chunkNumber = Math.floor(start / chunkSize) + 1;
    const chunkLabel = "chunk " + chunkNumber + "/" + totalChunks;

    logBuild(chunkLabel + ": typechecking " + chunk.length + " file(s)");

    exitCode = compileFiles(chunk, chunkLabel);
    if (exitCode !== 0) {
      break;
    }
  }

  if (exitCode === 0) {
    logBuild("typecheck completed");
  }
} finally {
  rmSync(buildDir, { force: true, recursive: true });
}

process.exit(exitCode);
`;
