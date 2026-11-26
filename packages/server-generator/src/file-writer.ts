import type {
  ImportExtension,
  OperationMetadata,
} from "@apical-ts/core-utils/shared";

import { writeTypeScriptFile } from "@apical-ts/core-utils";
import {
  createOutputSubdirectory,
  createSanitizedOperationEntries,
  formatImportSpecifier,
  writeOperationModuleFile,
} from "@apical-ts/core-utils/shared";
import path from "path";

/**
 * Creates server operations directory structure
 */
export async function createServerOperationsDirectory(
  outputDir: string,
): Promise<string> {
  return createOutputSubdirectory(outputDir, "server");
}

/**
 * Writes server operations index file
 */
export async function writeServerIndexFile(
  operations: OperationMetadata[],
  serverOperationsDir: string,
  options: { importExtension?: ImportExtension } = {},
): Promise<void> {
  const { importExtension = "ts" } = options;
  const sanitizedOperations = createSanitizedOperationEntries(operations);
  const exports = sanitizedOperations
    .map(({ sanitizedOperationId }) => {
      const specifier = formatImportSpecifier(
        `./${sanitizedOperationId}`,
        importExtension,
      );
      return `export { ${sanitizedOperationId}Wrapper } from "${specifier}";`;
    })
    .join("\n");

  /* Generate routes object with all route functions properly aliased */
  const routeImports = sanitizedOperations
    .map(({ sanitizedOperationId }) => {
      const specifier = formatImportSpecifier(
        `./${sanitizedOperationId}`,
        importExtension,
      );
      return `import { route as ${sanitizedOperationId}Route } from "${specifier}";`;
    })
    .join("\n");

  const routesObject = `export const routes = {
${sanitizedOperations
  .map(({ sanitizedOperationId }) => {
    return `${sanitizedOperationId}: ${sanitizedOperationId}Route,`;
  })
  .join("\n")}
} as const;`;

  const indexContent = `/* Route imports for routes object */
${routeImports}

/* Server operation wrappers */
${exports}

/* Re-export all handlers */
  ${sanitizedOperations
    .map(({ sanitizedOperationId }) => {
      const specifier = formatImportSpecifier(
        `./${sanitizedOperationId}`,
        importExtension,
      );
      return `export type { ${sanitizedOperationId}Handler } from "${specifier}";`;
    })
    .join("\n")}

/* Routes object with all route functions */
${routesObject}
`;

  const filePath = path.join(serverOperationsDir, "index.ts");
  await writeTypeScriptFile(filePath, indexContent);
}

/**
 * Writes a server operation wrapper file
 */
export async function writeServerOperationFile(
  operationId: string,
  wrapperCode: string,
  serverOperationsDir: string,
): Promise<void> {
  await writeOperationModuleFile(serverOperationsDir, operationId, wrapperCode);
}
