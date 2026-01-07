import type { OperationMetadata } from "@apical-ts/core-utils/shared";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import { promises as fs } from "fs";
import path from "path";

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
  serverOperationsDir: string,
): Promise<void> {
  const filePath = path.join(serverOperationsDir, `${operationId}.ts`);
  await fs.writeFile(filePath, wrapperCode);
}
