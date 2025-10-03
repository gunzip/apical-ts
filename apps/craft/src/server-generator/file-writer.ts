import { promises as fs } from "fs";
import path from "path";

import type { OperationMetadata } from "../client-generator/operation-extractor.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

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
  typeImports: Set<string>,
  serverOperationsDir: string,
): Promise<void> {
  const sanitizedId = sanitizeIdentifier(operationId);

  /* Separate different types of imports */
  const schemaImports: string[] = [];
  const parameterSchemaImports: string[] = [];
  const parameterTypeImports: string[] = [];

  for (const imp of typeImports) {
    if (
      imp.endsWith("Schema") &&
      (imp.includes("Query") || imp.includes("Path") || imp.includes("Headers"))
    ) {
      /* Parameter schemas - all come from the Parameters.ts file */
      parameterSchemaImports.push(imp);
    } else if (imp !== "z") {
      /* Regular schema types */
      schemaImports.push(`import { ${imp} } from "../schemas/${imp}.js";`);
    }
  }

  /* Build imports section */
  const imports: string[] = [];
  if (schemaImports.length > 0) {
    imports.push(...schemaImports);
  }

  /* Add parameter imports from the combined Parameters file */
  if (parameterSchemaImports.length > 0 || parameterTypeImports.length > 0) {
    const parameterImportItems = [
      ...parameterSchemaImports,
      ...parameterTypeImports,
    ].join(", ");
    imports.push(
      `import { ${parameterImportItems} } from "../schemas/${sanitizedId}Parameters.js";`,
    );
  }

  const fullCode =
    imports.length > 0
      ? `${imports.join("\n")}\n\n${wrapperCode}`
      : wrapperCode;

  const filePath = path.join(serverOperationsDir, `${operationId}.ts`);
  await fs.writeFile(filePath, fullCode);
}
