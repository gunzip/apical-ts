#!/usr/bin/env node

import { Command } from "commander";
import packageInfo from "../package.json" with { type: "json" };
import { generate } from "./core-generator/index.js";

const program = new Command();

program
  .name("typescript-openapi-generator")
  .description("Generate a TypeScript client from an OpenAPI specification.")
  .version("0.0.1");

program
  .command("generate")
  .description("Generate the client.")
  .requiredOption(
    "-i, --input <path>",
    "Path to the OpenAPI specification file."
  )
  .requiredOption("-o, --output <path>", "Path to the output directory.")
  .option("--generate-client", "Generate the full HTTP client.", false)
  .action(async (options: Record<string, unknown>) => {
    try {
      await generate(options as any);
      console.log("✅ Client generated successfully!");
    } catch (error) {
      console.error("❌ An error occurred during generation:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
