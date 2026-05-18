#!/usr/bin/env node

import { Command } from "commander";

import { convert } from "./converter.js";

const program = new Command();

program
  .name("zod-to-arktype")
  .description("Convert Zod v4 schemas to ArkType definitions.")
  .version("0.1.0");

program
  .command("convert")
  .description("Convert Zod schema files to ArkType.")
  .requiredOption(
    "-f, --from <format>",
    "Source format (currently: zod).",
    "zod",
  )
  .requiredOption(
    "-t, --to <format>",
    "Target format (currently: arktype).",
    "arktype",
  )
  .requiredOption("-i, --input <path>", "Input file or directory.")
  .requiredOption("-o, --output <path>", "Output file or directory.")
  .action(async (options: Record<string, string>) => {
    try {
      if (options.from !== "zod") {
        console.error(`❌ Unsupported source format: ${options.from}`);
        process.exit(1);
      }
      if (options.to !== "arktype") {
        console.error(`❌ Unsupported target format: ${options.to}`);
        process.exit(1);
      }

      const results = await convert({
        from: "zod",
        to: "arktype",
        input: options.input,
        output: options.output,
      });

      const successCount = results.filter((r) => r.errors.length === 0).length;
      const errorCount = results.filter((r) => r.errors.length > 0).length;

      for (const result of results) {
        if (result.errors.length > 0) {
          console.error(`❌ ${result.filePath}: ${result.errors.join(", ")}`);
        }
      }

      console.log(
        `✅ Conversion complete: ${successCount} file(s) converted${errorCount > 0 ? `, ${errorCount} error(s)` : ""}.`,
      );
    } catch (error) {
      console.error("❌ An error occurred during conversion:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
