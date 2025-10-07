#!/usr/bin/env node

/*
 * CLI for Zod to ArkType converter
 */

import { Command } from "commander";
import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { z } from "zod";

import { convertZodToArkType } from "./converter.js";
import {
  writeArktypeSchema,
  writeIndexFile,
  writePackageJson,
  writeTsConfig,
} from "./file-writer.js";
import { parseZodSchemaFile } from "./parser.js";

/**
 * Converts all Zod schema files in a directory to ArkType
 */
async function convertDirectory(
  inputDir: string,
  outputDir: string,
): Promise<void> {
  /* Read all TypeScript files from input directory */
  const files = await readdir(inputDir);
  const tsFiles = files.filter(
    (file) => extname(file) === ".ts" && file !== "index.ts",
  );

  if (tsFiles.length === 0) {
    throw new Error(`No TypeScript files found in ${inputDir}`);
  }

  // eslint-disable-next-line no-console
  console.log(`📁 Found ${tsFiles.length} schema files`);

  /* Track import sources for cross-schema references */
  const importSourceMap = new Map<string, string>();
  const schemaNames: string[] = [];

  /* First pass: collect all schema names and their sources */
  for (const file of tsFiles) {
    const schemaName = basename(file, ".ts");
    schemaNames.push(schemaName);
    importSourceMap.set(schemaName, `./${schemaName}.js`);
  }

  /* Second pass: convert each schema */
  for (const file of tsFiles) {
    const inputPath = join(inputDir, file);
    const schemaName = basename(file, ".ts");
    const outputPath = join(outputDir, file);

    // eslint-disable-next-line no-console
    console.log(`  ⚙️  Converting ${schemaName}...`);

    try {
      /* Parse the Zod schema file */
      const parsed = await parseZodSchemaFile(inputPath);

      /* Evaluate the schema definition into a Zod instance.
       * We provide `z` and placeholders for imported symbols.
       */
      const importedNames = new Set<string>();
      for (const imp of parsed.imports) {
        for (const name of imp.names) {
          if (name !== "z") importedNames.add(name);
        }
      }
      const paramNames = ["z", ...Array.from(importedNames)];
      const importedList = Array.from(importedNames);
      const paramValues: unknown[] = [
        z,
        ...importedList.map((name) => z.any().describe(`ref:${name}`)),
      ];
      // Wrap in parentheses to ensure expression evaluation
      const expr = new Function(
        ...paramNames,
        `return (${parsed.schemaDefinition});`,
      );
      const zodInstance = expr(...paramValues);

      /* Convert to ArkType */
      const converted = convertZodToArkType(zodInstance, parsed.schemaName);

      /* Build import sources map */
      const sources = new Map<string, string>();
      for (const importInfo of parsed.imports) {
        for (const name of importInfo.names) {
          /* Map to relative import path */
          const mappedSource = importSourceMap.get(name);
          if (mappedSource) {
            sources.set(name, mappedSource);
          } else {
            /* Keep original source if not a schema */
            sources.set(name, importInfo.source);
          }
        }
      }

      /* Write the converted schema */
      await writeArktypeSchema(outputPath, {
        arktypeCode: converted.code,
        comments: parsed.comments,
        imports: converted.imports,
        importSources: sources,
        schemaName: parsed.schemaName,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `  ⚠️  Failed to convert ${schemaName}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /* Write index file */
  // eslint-disable-next-line no-console
  console.log("  📝 Writing index file...");
  await writeIndexFile(outputDir, schemaNames);

  /* Write package.json and tsconfig.json to help consumers typecheck/build */
  // eslint-disable-next-line no-console
  console.log("  📦 Writing package.json and tsconfig.json...");
  await writePackageJson(outputDir);
  await writeTsConfig(outputDir);
}

async function main() {
  const program = new Command();

  program
    .name("zod-to-arktype")
    .description("Convert Zod v4 schemas to ArkType schemas")
    .version("0.1.0");

  program
    .command("convert")
    .description("Convert Zod schemas directory to ArkType schemas")
    .requiredOption(
      "-i, --input <path>",
      "Input directory containing Zod schemas",
    )
    .requiredOption(
      "-o, --output <path>",
      "Output directory for ArkType schemas",
    )
    .action(async (options: { input: string; output: string }) => {
      try {
        // eslint-disable-next-line no-console
        console.log("🔄 Converting Zod schemas to ArkType...");
        await convertDirectory(options.input, options.output);
        // eslint-disable-next-line no-console
        console.log("✅ Conversion completed successfully!");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          "❌ Conversion failed:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main();
