import type { ImportManager } from "@apical-ts/core-utils";
import type { OperationMetadata } from "@apical-ts/core-utils/shared";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import { categorizeImportsFromManager } from "@apical-ts/core-utils/shared";
import { promises as fs } from "fs";
import path from "path";

/**
 * Creates routes directory structure
 */
export async function createRoutesDirectory(
  outputDir: string,
): Promise<string> {
  const routesDir = path.join(outputDir, "routes");
  await fs.mkdir(routesDir, { recursive: true });
  return routesDir;
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

  categorized.regularImports.forEach((imp) => {
    schemaImports.push(`import { ${imp} } from "../schemas/${imp}.js";`);
  });

  /* Build imports section */
  const imports: string[] = [];
  if (schemaImports.length > 0) {
    imports.push(...schemaImports);
  }

  const fullCode =
    imports.length > 0 ? `${imports.join("\n")}\n\n${routeCode}` : routeCode;

  const filePath = path.join(routesDir, `${operationId}.ts`);
  await fs.writeFile(filePath, fullCode);
}

/**
 * Writes routes index file with individual exports and combined routes object
 */
export async function writeRoutesIndexFile(
  operations: OperationMetadata[],
  routesDir: string,
): Promise<void> {
  /* Generate individual route exports for both client and server */
  const exports = operations
    .map(({ operationId }) => {
      const sanitizedId = sanitizeIdentifier(operationId);
      return `export { clientRoute as ${sanitizedId}ClientRoute, serverRoute as ${sanitizedId}ServerRoute } from "./${operationId}.js";`;
    })
    .join("\n");

  /* Generate route imports for routes object - use server routes by default */
  const routeImports = operations
    .map(({ operationId }) => {
      const sanitizedId = sanitizeIdentifier(operationId);
      return `import { serverRoute as ${sanitizedId}Route } from "./${operationId}.js";`;
    })
    .join("\n");

  /* Generate routes object with all route metadata */
  const routesObject = `export const routes = {
${operations
  .map(({ operationId }) => {
    const sanitizedId = sanitizeIdentifier(operationId);
    return `  ${sanitizedId}: ${sanitizedId}Route,`;
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
  await fs.writeFile(filePath, indexContent);
}
