#!/usr/bin/env node
/* eslint-disable no-console */

import { Command } from "commander";

import { generate } from "./core-generator/index.js";

const program = new Command();

program
  .name("@apical-ts/craft")
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
  .option(
    "--generate-client, --client",
    "Generate the full HTTP client.",
    false,
  )
  .option(
    "--generate-server, --server",
    "Generate server endpoint wrappers.",
    false,
  )
  // Disable strict validation setting, this should remain strict for the server
  // and loose for the client
  // .option(
  //   "--strict-validation",
  //   "Use strict object validation (reject unknown properties)",
  //   false,
  // )
  .action(async (options: Record<string, unknown>) => {
    try {
      console.log(options);

      // Map CLI option names to GenerationOptions interface
      const generationOptions = {
        generateClient: Boolean(options.client),
        generateServer: Boolean(options.server),
        input: String(options.input),
        output: String(options.output),
      };

      await generate(generationOptions);
      console.log("✅ Generation completed successfully!");
    } catch (error) {
      console.error("❌ An error occurred during generation:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
