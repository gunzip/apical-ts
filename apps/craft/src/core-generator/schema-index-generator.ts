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

      /* Read the parameter file to check which schemas actually exist */
      const parameterFileContent = await fs.readFile(
        parameterFilePath,
        "utf-8",
      );

      /* Collect available schema exports from the file */
      const availableExports: string[] = [];

      /* Check for both client and server schema exports */
      const querySchemaName = `${sanitizedId}QuerySchema`;
      const pathSchemaName = `${sanitizedId}PathSchema`;
      const headersSchemaName = `${sanitizedId}HeadersSchema`;

      if (parameterFileContent.includes(`export { ${querySchemaName} }`)) {
        availableExports.push(querySchemaName);
      }
      if (parameterFileContent.includes(`export { ${pathSchemaName} }`)) {
        availableExports.push(pathSchemaName);
      }
      if (parameterFileContent.includes(`export { ${headersSchemaName} }`)) {
        availableExports.push(headersSchemaName);
      }

      /* Only add imports if there are any exports */
      if (availableExports.length > 0) {
        imports.push(`import {`);
        imports.push(...availableExports.map((exp) => `  ${exp},`));
        imports.push(`} from "./${parameterFileName}.js";`);

        /* Add to exports */
        exports.push(...availableExports);
      }
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
    ...exports.map((exp) => `  ${exp},`),
    "};",
    "",
  ].join("\n");

  /* Write the index file */
  const indexPath = path.join(schemasDir, "index.ts");
  await fs.writeFile(indexPath, content, "utf-8");
}
