import { promises as fs } from "fs";
import path from "path";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";
import { PARAMETER_SCHEMA_BUNDLE_BASE_NAME } from "../shared/parameter-schema-bundle.js";

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
    if (baseName === PARAMETER_SCHEMA_BUNDLE_BASE_NAME) {
      continue;
    }

    imports.push(`import { ${baseName} } from "./${baseName}.js";`);
    exports.push(baseName);
  }

  const parameterExports = collectParameterSchemaExports(operationParameters);
  if (parameterExports.length > 0) {
    imports.push(`import {`);
    imports.push(...parameterExports.map((exp) => `  ${exp},`));
    imports.push(`} from "./${PARAMETER_SCHEMA_BUNDLE_BASE_NAME}.js";`);
    exports.push(...parameterExports);
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

function collectParameterSchemaExports(
  operationParameters: readonly OperationParameterMetadata[],
): string[] {
  const exports: string[] = [];

  for (const parameterMetadata of operationParameters) {
    const sanitizedId = sanitizeIdentifier(parameterMetadata.operationId);

    if (parameterMetadata.parameterGroups.queryParams.length > 0) {
      exports.push(`${sanitizedId}QuerySchema`);
    }

    if (parameterMetadata.parameterGroups.pathParams.length > 0) {
      exports.push(`${sanitizedId}PathSchema`);
    }

    if (
      parameterMetadata.parameterGroups.headerParams.length > 0 ||
      (parameterMetadata.securityHeaders?.length ?? 0) > 0
    ) {
      exports.push(`${sanitizedId}HeadersSchema`);
    }
  }

  return exports;
}
