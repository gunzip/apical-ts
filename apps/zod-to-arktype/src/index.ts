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
  writeArktypeModule,
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

  const indexExports: { name: string; source: string }[] = [];

  /* Second pass: convert each schema */
  for (const file of tsFiles) {
    const inputPath = join(inputDir, file);
    const moduleBase = basename(file, ".ts");
    const outputPath = join(outputDir, file);

    // eslint-disable-next-line no-console
    console.log(`  ⚙️  Converting ${moduleBase}...`);

    try {
      const parsedModule = await parseZodSchemaFile(inputPath);

      // Build placeholder params for evaluating schema definitions
      const importedNames = new Set<string>();
      for (const imp of parsedModule.imports) {
        for (const name of imp.names) if (name !== "z") importedNames.add(name);
      }
      const paramNames = ["z", ...Array.from(importedNames)];
      const importedList = Array.from(importedNames);
      const paramValues: unknown[] = [
        z,
        ...importedList.map((name) => z.any().describe(`ref:${name}`)),
      ];

      const moduleImports = new Set<string>();
      const importSourceMap = new Map<string, string>();
      const localNames = new Set(parsedModule.schemas.map((s) => s.name));
      for (const imp of parsedModule.imports) {
        for (const name of imp.names) {
          if (localNames.has(name)) {
            importSourceMap.set(name, `./${moduleBase}.js`);
          } else {
            importSourceMap.set(name, imp.source);
          }
        }
      }

      const exportsBlocks: {
        code: string;
        comments: string;
        name: string;
      }[] = [];
      for (const s of parsedModule.schemas) {
        const expr = new Function(...paramNames, `return (${s.definition});`);
        const zodInstance = expr(...paramValues);
        const converted = convertZodToArkType(zodInstance, s.name);
        converted.imports.forEach((n) => moduleImports.add(n));
        exportsBlocks.push({
          code: converted.code,
          comments: s.comments,
          name: s.name,
        });
      }

      await writeArktypeModule(outputPath, {
        exports: exportsBlocks,
        imports: moduleImports,
        importSources: importSourceMap,
      });

      // Record index exports only after successful conversion/write
      for (const s of parsedModule.schemas) {
        indexExports.push({ name: s.name, source: `./${moduleBase}.js` });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `  ⚠️  Failed to convert ${moduleBase}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /* Write index file */
  // eslint-disable-next-line no-console
  console.log("  📝 Writing index file...");
  await writeIndexFile(outputDir, indexExports);

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
