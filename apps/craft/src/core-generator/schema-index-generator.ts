import { promises as fs } from "fs";
import path from "path";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Generates the schema index barrel file that exports all schemas including parameter schemas
 */
export async function generateSchemaIndex(
  schemasDir: string,
  operationParameters: OperationParameterMetadata[],
): Promise<void> {
  /* Read all .ts files in schemas directory */
  const files = await fs.readdir(schemasDir);
  const schemaFiles = files.filter(
    (file) => file.endsWith(".ts") && file !== "index.ts",
  );

  const imports: string[] = [];
  const exports: string[] = [];

  /* Add imports and exports for regular schema files */
  for (const file of schemaFiles) {
    const baseName = path.basename(file, ".ts");

    /* Skip parameter files - they will be handled separately */
    if (file.includes("Parameters.ts")) {
      continue;
    }

    imports.push(`import { ${baseName} } from "./${baseName}.js";`);
    exports.push(baseName);
  }

  /* Add imports and exports for parameter schemas */
  for (const parameterMetadata of operationParameters) {
    const sanitizedId = sanitizeIdentifier(parameterMetadata.operationId);
    const parameterFileName = `${sanitizedId}Parameters`;

    /* Check if the parameter file exists */
    const parameterFilePath = path.join(schemasDir, `${parameterFileName}.ts`);
    try {
      await fs.access(parameterFilePath);

      /* Add imports for all parameter schema exports */
      imports.push(`import {`);
      imports.push(`  ${sanitizedId}QuerySchema,`);
      imports.push(`  ${sanitizedId}PathSchema,`);
      imports.push(`  ${sanitizedId}HeadersSchema,`);
      imports.push(`} from "./${parameterFileName}.js";`);

      /* Add to exports */
      exports.push(
        `${sanitizedId}QuerySchema`,
        `${sanitizedId}PathSchema`,
        `${sanitizedId}HeadersSchema`,
      );
    } catch {
      /* Parameter file doesn't exist - skip */
    }
  }

  /* Sort exports for consistency */
  exports.sort();

  /* Generate the index file content */
  const content = [
    ...imports,
    "",
    "export {",
    ...exports.map((exp, index) =>
      index === exports.length - 1 ? `  ${exp},` : `  ${exp},`,
    ),
    "};",
    "",
  ].join("\n");

  /* Write the index file */
  const indexPath = path.join(schemasDir, "index.ts");
  await fs.writeFile(indexPath, content, "utf-8");
}
