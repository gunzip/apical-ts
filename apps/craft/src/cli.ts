import type { ExtraPropsMode } from "@apical-ts/core-utils";

import { Command } from "commander";
import { readFileSync } from "node:fs";

import { parseFormatOverrideArguments } from "./format-overrides.js";
import { generate } from "./generate.js";

/*
 * Reads the CLI package version from package.json at runtime so --version
 * always matches the published package version without manual updates.
 */
export function getPackageVersion(): string {
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const rawPackageJson = readFileSync(packageJsonUrl, "utf8");
  const parsed: unknown = JSON.parse(rawPackageJson);

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    typeof parsed.version === "string"
  ) {
    return parsed.version;
  }

  throw new Error("Unable to read package version from package.json");
}

/*
 * Creates and configures the Commander CLI program without parsing argv
 * so tests can inspect options and version metadata without side effects.
 */
export function createCliProgram(): Command {
  const program = new Command();

  program
    .name("@apical-ts/craft")
    .description(
      "Generate TypeScript from an OpenAPI or JSON Schema specification.",
    )
    .version(getPackageVersion());

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
        /* eslint-disable-next-line no-console */
        console.log(
          "✅ Generation completed successfully%s!",
          generationOptions.profile ? "" : ` in ${elapsedMs.toFixed(2)} ms`,
        );
      } catch (error) {
        /* eslint-disable-next-line no-console */
        console.error("❌ An error occurred during generation:", error);
        process.exit(1);
      }
    });

  return program;
}

function collectOption(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}
