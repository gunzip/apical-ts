import * as fs from "node:fs";
import * as path from "node:path";

import { parseZodFile, parseZodFiles } from "./ast-parser.js";
import type { ParsedFileResult } from "./ast-parser.js";
import { rewriteImports } from "./import-rewriter.js";
import type { ConvertOptions, FileConversionResult } from "./types.js";
import { convertZodToArktype } from "./zod-to-arktype.js";

export async function convert(
  options: ConvertOptions,
): Promise<FileConversionResult[]> {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    return convertDirectory(inputPath, outputPath);
  }
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  const result = convertSingleFile(inputPath, outputPath);
  return [result];
}

function convertDirectory(
  inputDir: string,
  outputDir: string,
): FileConversionResult[] {
  const files = discoverTypeScriptFiles(inputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  /* Batch-parse all files in a single ts-morph Project for performance */
  const parsedFiles = parseZodFiles(files);

  const results: FileConversionResult[] = [];
  for (const file of files) {
    const relativePath = path.relative(inputDir, file);
    const outputFile = path.join(outputDir, relativePath);
    const outputFileDir = path.dirname(outputFile);
    fs.mkdirSync(outputFileDir, { recursive: true });

    const parsed = parsedFiles.get(file);
    if (!parsed) continue;

    const result = convertParsedFile(parsed, outputFile);
    results.push(result);
  }
  return results;
}

function convertSingleFile(
  inputFile: string,
  outputFile: string,
): FileConversionResult {
  const errors: string[] = [];
  try {
    const parsed = parseZodFile(inputFile);
    return convertParsedFile(parsed, outputFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    return { filePath: outputFile, content: "", errors };
  }
}

function convertParsedFile(
  parsed: ParsedFileResult,
  outputFile: string,
): FileConversionResult {
  const errors: string[] = [];
  try {
    const { declarations, imports } = parsed;
    const allReferencedSchemas = new Set<string>();
    const outputLines: string[] = [];
    let needsTypeImport = false;

    for (const decl of declarations) {
      const result = convertZodToArktype(decl.callChain);
      needsTypeImport = needsTypeImport || result.needsTypeImport;
      for (const ref of result.referencedSchemas) {
        allReferencedSchemas.add(ref);
      }

      const exportPrefix = decl.isExported ? "export " : "";
      outputLines.push(`${exportPrefix}const ${decl.name} = ${result.code};`);

      if (decl.hasTypeExport) {
        outputLines.push(
          `${exportPrefix}type ${decl.name} = typeof ${decl.name}.infer;`,
        );
      }
    }

    const importLines = rewriteImports(
      imports,
      allReferencedSchemas,
      needsTypeImport,
    );

    const content = [...importLines, "", ...outputLines, ""].join("\n");
    fs.writeFileSync(outputFile, content, "utf-8");

    return { filePath: outputFile, content, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    return { filePath: outputFile, content: "", errors };
  }
}

function discoverTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...discoverTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }

  return results.sort();
}
