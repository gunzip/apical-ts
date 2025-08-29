#!/usr/bin/env node
/* eslint-disable no-console */

import { Command } from "commander";

import { generate } from "./core-generator/index.js";

const program = new Command();

program
  .name("yanogen-ts")
  .description("Generate TypeScript from an OpenAPI specification.")
  .version("0.0.1");

program
  .command("generate")
  .description("Generate TypeScript client, server and/or schemas.")
  .requiredOption(
    "-i, --input <path>",
    "Path to the OpenAPI specification file.",
  )
  .requiredOption("-o, --output <path>", "Path to the output directory.")
  .option("--generate-client", "Generate the full HTTP client.", false)
  .option("--generate-server", "Generate server endpoint wrappers.", false)
  .option(
    "--strict-validation",
    "Use strict object validation (reject unknown properties)",
    false,
  )
  .option(
    "--force-validation",
    "Automatically validate responses with Zod in generated operations (default: manual validation)",
    false,
  )
  .action(async (options: Record<string, unknown>) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await generate(options as any);
      console.log("✅ Client generated successfully!");
    } catch (error) {
      console.error("❌ An error occurred during generation:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
