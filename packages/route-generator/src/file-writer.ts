import type { ImportManager } from "@apical-ts/core-utils";
import type {
  ImportExtension,
  OperationMetadata,
} from "@apical-ts/core-utils/shared";

import { writeTypeScriptFile } from "@apical-ts/core-utils";
import {
  categorizeImportsFromManager,
  createOutputSubdirectory,
  createSanitizedOperationEntries,
  formatImportSpecifier,
  writeOperationModuleFile,
} from "@apical-ts/core-utils/shared";
import path from "path";

/**
 * Creates routes directory structure
 */
export async function createRoutesDirectory(
  outputDir: string,
): Promise<string> {
  return createOutputSubdirectory(outputDir, "routes");
}

/**
 * Writes a route metadata file
 */
export async function writeRouteMetadataFile(
  operationId: string,
  routeCode: string,
  importManager: ImportManager,
  routesDir: string,
): Promise<void> {
  /* Use structured approach to categorize imports */
  const categorized = categorizeImportsFromManager(importManager);

  /* Build schema imports from regular imports */
  const schemaImports: string[] = [];
  const importExtension = importManager.getImportExtension();

  categorized.regularImports.forEach((imp) => {
    schemaImports.push(
      `import { ${imp} } from "${formatImportSpecifier(`../schemas/${imp}`, importExtension)}";`,
    );
  });

  /* Build imports section */
  const imports: string[] = [];
  if (schemaImports.length > 0) {
    imports.push(...schemaImports);
  }

  const fullCode =
    imports.length > 0 ? `${imports.join("\n")}\n\n${routeCode}` : routeCode;

  await writeOperationModuleFile(routesDir, operationId, fullCode);
}

/**
 * Writes routes index file with individual exports and combined routes object
 */
export async function writeRoutesIndexFile(
  operations: OperationMetadata[],
  routesDir: string,
  options: { importExtension?: ImportExtension } = {},
): Promise<void> {
  const { importExtension = "ts" } = options;
  const sanitizedOperations = createSanitizedOperationEntries(operations);

  /* Generate individual route exports for both client and server */
  const exports = sanitizedOperations
    .map(({ sanitizedOperationId }) => {
      const specifier = formatImportSpecifier(
        `./${sanitizedOperationId}`,
        importExtension,
      );
      return `export { clientRoute as ${sanitizedOperationId}ClientRoute, serverRoute as ${sanitizedOperationId}ServerRoute } from "${specifier}";`;
    })
    .join("\n");

  /* Generate route imports for routes object - use server routes by default */
  const routeImports = sanitizedOperations
    .map(({ sanitizedOperationId }) => {
      const specifier = formatImportSpecifier(
        `./${sanitizedOperationId}`,
        importExtension,
      );
      return `import { serverRoute as ${sanitizedOperationId}Route } from "${specifier}";`;
    })
    .join("\n");

  /* Generate routes object with all route metadata */
  const routesObject = `export const routes = {
${sanitizedOperations
  .map(({ sanitizedOperationId }) => {
    return `  ${sanitizedOperationId}: ${sanitizedOperationId}Route,`;
  })
  .join("\n")}
} as const;`;

  const indexContent = `/* Individual route exports */
${exports}

/* Route imports for routes object */
${routeImports}

/* Combined routes object */
${routesObject}
`;

  const filePath = path.join(routesDir, "index.ts");
  await writeTypeScriptFile(filePath, indexContent);
}
