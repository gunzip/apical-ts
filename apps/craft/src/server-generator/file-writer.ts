import { promises as fs } from "fs";
import path from "path";

import type { OperationMetadata } from "../client-generator/operation-extractor.js";
import type { ImportManager } from "../core-generator/import-types.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import {
  categorizeImportsFromManager,
  filterServerParameterImportsFromManager,
} from "../shared/parameter-utils.js";

/**
 * Creates server operations directory structure
 */
export async function createServerOperationsDirectory(
  outputDir: string,
): Promise<string> {
  const serverOperationsDir = path.join(outputDir, "server");
  await fs.mkdir(serverOperationsDir, { recursive: true });
  return serverOperationsDir;
}

/**
 * Writes server operations index file
 */
export async function writeServerIndexFile(
  operations: OperationMetadata[],
  serverOperationsDir: string,
): Promise<void> {
  const exports = operations
    .map(({ operationId }) => {
      const sanitizedId = sanitizeIdentifier(operationId);
      return `export { ${sanitizedId}Wrapper } from "./${operationId}.js";`;
    })
    .join("\n");

  /* Generate routes object with all route functions properly aliased */
  const routeImports = operations
    .map(({ operationId }) => {
      const sanitizedId = sanitizeIdentifier(operationId);
      return `import { route as ${sanitizedId}Route } from "./${operationId}.js";`;
    })
    .join("\n");

  const routesObject = `export const routes = {
${operations
  .map(({ operationId }) => {
    const sanitizedId = sanitizeIdentifier(operationId);
    return `${sanitizedId}: ${sanitizedId}Route,`;
  })
  .join("\n")}
} as const;`;

  const indexContent = `/* Route imports for routes object */
${routeImports}

/* Server operation wrappers */
${exports}

/* Re-export all handlers */
${operations
  .map(({ operationId }) => {
    const sanitizedId = sanitizeIdentifier(operationId);
    return `export type { ${sanitizedId}Handler } from "./${operationId}.js";`;
  })
  .join("\n")}

/* Routes object with all route functions */
${routesObject}
`;

  const filePath = path.join(serverOperationsDir, "index.ts");
  await fs.writeFile(filePath, indexContent);
}

/**
 * Writes a server operation wrapper file
 */
export async function writeServerOperationFile(
  operationId: string,
  wrapperCode: string,
  importManager: ImportManager,
  serverOperationsDir: string,
): Promise<void> {
  /* Use structured approach to categorize imports */
  const categorized = categorizeImportsFromManager(importManager);

  /* Filter out parameter schema imports that should be skipped for server generation */
  const allowedParameterImports =
    filterServerParameterImportsFromManager(importManager);

  /* Build schema imports from regular imports and allowed parameter imports */
  const schemaImports: string[] = [];

  // Add regular schema imports
  categorized.regularImports.forEach((imp) => {
    schemaImports.push(`import { ${imp} } from "../schemas/${imp}.js";`);
  });

  // Add allowed parameter imports (non-schema parameters)
  allowedParameterImports.forEach((paramImport) => {
    schemaImports.push(
      `import { ${paramImport.importName} } from "../schemas/${paramImport.importName}.js";`,
    );
  });

  /* Build imports section */
  const imports: string[] = [];

  /* Add Zod import if needed */
  if (categorized.zodImport) {
    imports.push(`import * as z from "zod";`);
  }

  if (schemaImports.length > 0) {
    imports.push(...schemaImports);
  }

  const fullCode =
    imports.length > 0
      ? `${imports.join("\n")}\n\n${wrapperCode}`
      : wrapperCode;

  const filePath = path.join(serverOperationsDir, `${operationId}.ts`);
  await fs.writeFile(filePath, fullCode);
}
