#!/usr/bin/env node
/* eslint-disable no-console */

import { Command } from "commander";
import { pathToFileURL } from "url";

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
  .option("--profile", "Print timing breakdown for generation phases.", false)
  .option(
    "--zod-transform <file>",
    "Path to a file that exports a Zod transform function",
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
      const started = process.hrtime.bigint();

      // Load zodTransform function if provided
      let zodTransform;
      if (options.zodTransform) {
        try {
          const transformPath = String(options.zodTransform);
          const transformUrl = pathToFileURL(transformPath).href;
          const transformModule = await import(transformUrl);
          zodTransform = transformModule.default;

          if (typeof zodTransform !== "function") {
            console.error(
              "❌ The zodTransform file must export a default function",
            );
            process.exit(1);
          }
          console.log(`✅ Loaded zodTransform from ${transformPath}`);
        } catch (error) {
          console.error("❌ Failed to load zodTransform:", error);
          process.exit(1);
        }
      }

      // Map CLI option names to GenerationOptions interface
      const generationOptions = {
        generateClient: Boolean(options.client),
        generateServer: Boolean(options.server),
        input: String(options.input),
        output: String(options.output),
        profile: Boolean(options.profile),
        zodTransform,
      };

      await generate(generationOptions);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      console.log(
        "✅ Generation completed successfully%s!",
        generationOptions.profile ? "" : `in ${elapsedMs.toFixed(2)} ms`,
      );
    } catch (error) {
      console.error("❌ An error occurred during generation:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
