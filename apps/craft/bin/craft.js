#!/usr/bin/env node
// Wrapper to allow the CLI to be executed even before build output exists.
// It defers to dist/index.js after a workspace installation/build.
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distEntrypoint = join(__dirname, "..", "dist", "index.js");

if (!existsSync(distEntrypoint)) {
  // eslint-disable-next-line no-console
  console.error(
    '[craft] Built file dist/index.js not found. Run "pnpm --filter @apical-ts/craft build" first.',
  );
  process.exit(1);
}

// Use dynamic import to preserve ESM semantics
import(distEntrypoint).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[craft] Failed to execute CLI:", err);
  process.exit(1);
});
