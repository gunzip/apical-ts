#!/usr/bin/env node
/* eslint-disable no-console */

import type { ExtraPropsMode } from "@apical-ts/core-utils";

import { Command } from "commander";

import { parseFormatOverrideArguments } from "./format-overrides.js";
import { generate } from "./generate.js";

const program = new Command();

program
  .name("@apical-ts/craft")
  .description(
    "Generate TypeScript from an OpenAPI or JSON Schema specification.",
  )
  .version("0.20.0");

program
  .command("generate")
  .description("Generate TypeScript client, server and/or schemas.")
  .requiredOption(
    "-i, --input <path>",
    "Path to the OpenAPI or JSON Schema file.",
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
  .option("--generate-routes, --routes", "Generate route metadata.", false)
  .option("--profile", "Print timing breakdown for generation phases.", false)
  .option(
    "--format <mapping>",
    "Override an OpenAPI string format with <format>=<module-or-path>[#<export>]. Repeatable.",
    collectOption,
    [],
  )
  .option(
    "--extra-props <mode>",
    "Control how additional properties are handled in object schemas. Options: strip (default), loose, strict",
    "strip",
  )
  .action(async (options: Record<string, unknown>) => {
    try {
      const started = process.hrtime.bigint();
      const generationOptions = {
        extraProps: String(options.extraProps) as ExtraPropsMode,
        formatOverrides: parseFormatOverrideArguments(
          Array.isArray(options.format)
            ? options.format.map((value) => String(value))
            : [],
        ),
        generateClient: Boolean(options.client),
        generateRoutes: Boolean(options.routes),
        generateServer: Boolean(options.server),
        input: String(options.input),
        output: String(options.output),
        profile: Boolean(options.profile),
      };

      await generate(generationOptions);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      console.log(
        "✅ Generation completed successfully%s!",
        generationOptions.profile ? "" : ` in ${elapsedMs.toFixed(2)} ms`,
      );
    } catch (error) {
      console.error("❌ An error occurred during generation:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);

function collectOption(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}
