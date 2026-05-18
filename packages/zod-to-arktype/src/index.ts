#!/usr/bin/env node

import { Command } from "commander";

import { convert } from "./converter.js";
import type { ProgressInfo } from "./converter.js";

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

      const isTTY = process.stdout.isTTY;

      const onProgress = (info: ProgressInfo) => {
        if (isTTY) {
          process.stdout.write(
            `\r📝 [${info.current}/${info.total}] ${info.currentFile}${"".padEnd(20)}`,
          );
        } else {
          console.log(`📝 [${info.current}/${info.total}] ${info.currentFile}`);
        }
      };

      const results = await convert(
        {
          from: "zod",
          to: "arktype",
          input: options.input,
          output: options.output,
        },
        onProgress,
      );

      if (isTTY) {
        process.stdout.write("\r" + "".padEnd(80) + "\r");
      }

      for (const result of results.errors) {
        console.error(`❌ ${result.filePath}: ${result.errors.join(", ")}`);
      }

      if (results.totalCount === 0) {
        console.log("✅ Conversion complete: 0 file(s) converted.");
        return;
      }

      console.log(
        `✅ Conversion complete: ${results.successCount} file(s) converted${results.errors.length > 0 ? `, ${results.errors.length} error(s)` : ""}.`,
      );
    } catch (error) {
      console.error("❌ An error occurred during conversion:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
