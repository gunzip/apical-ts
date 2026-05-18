import * as fs from "node:fs";
import * as path from "node:path";

import { createZodFileParser } from "./ast-parser.js";
import type { ParsedFileResult, ZodFileParser } from "./ast-parser.js";
import { rewriteImports } from "./import-rewriter.js";
import type {
  ConversionSummary,
  ConvertOptions,
  FileConversionError,
} from "./types.js";
import { convertZodToArktype } from "./zod-to-arktype.js";

export interface ProgressInfo {
  currentFile: string;
  current: number;
  total: number;
}

export type ProgressCallback = (info: ProgressInfo) => void;

export async function convert(
  options: ConvertOptions,
  onProgress?: ProgressCallback,
): Promise<ConversionSummary> {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    return convertDirectory(inputPath, outputPath, onProgress);
  }
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });
  onProgress?.({
    currentFile: path.basename(inputPath),
    current: 1,
    total: 1,
  });
  const error = convertSingleFile(inputPath, outputPath, createZodFileParser());
  return {
    totalCount: 1,
    successCount: error ? 0 : 1,
    errors: error ? [error] : [],
  };
}

function convertDirectory(
  inputDir: string,
  outputDir: string,
  onProgress?: ProgressCallback,
): ConversionSummary {
  const files = discoverTypeScriptFiles(inputDir);
  const total = files.length;
  const parser = createZodFileParser();
  const ensuredDirectories = new Set<string>();
  let successCount = 0;
  const errors: FileConversionError[] = [];

  ensureDirectoryExists(outputDir, ensuredDirectories);
  let current = 0;
  for (const file of files) {
    current++;
    const relativePath = path.relative(inputDir, file);
    const outputFile = path.join(outputDir, relativePath);
    ensureDirectoryExists(path.dirname(outputFile), ensuredDirectories);

    onProgress?.({ currentFile: relativePath, current, total });

    const error = convertSingleFile(file, outputFile, parser);
    if (error) {
      errors.push(error);
      continue;
    }

    successCount++;
  }

  return { totalCount: total, successCount, errors };
}

function convertSingleFile(
  inputFile: string,
  outputFile: string,
  parser: ZodFileParser,
): FileConversionError | undefined {
  const errors: string[] = [];
  try {
    const parsed = parser.parseFile(inputFile);
    return convertParsedFile(parsed, outputFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    return { filePath: outputFile, errors };
  }
}

function convertParsedFile(
  parsed: ParsedFileResult,
  outputFile: string,
): FileConversionError | undefined {
  const errors: string[] = [];
  try {
    const { declarations, imports, typeAliases } = parsed;
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

    /* Emit type aliases with different names (e.g., type FooType = z.infer<typeof Foo>) */
    for (const alias of typeAliases) {
      const exportPrefix = alias.isExported ? "export " : "";
      outputLines.push(
        `${exportPrefix}type ${alias.name} = typeof ${alias.referencedConst}.infer;`,
      );
    }

    const importLines = rewriteImports(
      imports,
      allReferencedSchemas,
      needsTypeImport,
    );

    const content = [...importLines, "", ...outputLines, ""].join("\n");
    fs.writeFileSync(outputFile, content, "utf-8");

    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    return { filePath: outputFile, errors };
  }
}

function ensureDirectoryExists(
  dirPath: string,
  ensuredDirectories: Set<string>,
): void {
  if (ensuredDirectories.has(dirPath)) {
    return;
  }

  fs.mkdirSync(dirPath, { recursive: true });
  ensuredDirectories.add(dirPath);
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
