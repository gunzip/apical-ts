import { promises as fs } from "fs";
import path from "path";
import prettier from "prettier";

import type { OperationMetadata } from "../client-generator/operation-extractor.js";

/**
 * Creates server operations directory structure
 */
export async function createServerOperationsDirectory(
  outputDir: string,
): Promise<string> {
  const serverOperationsDir = path.join(outputDir, "server-operations");
  await fs.mkdir(serverOperationsDir, { recursive: true });
  return serverOperationsDir;
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
  /* Add schema imports */
  const imports = Array.from(typeImports)
    .map((imp) => `import { ${imp} } from "../schemas/${imp}.js";`)
    .join("\n");

  const fullCode = imports ? `${imports}\n\n${wrapperCode}` : wrapperCode;

  /* Format with Prettier */
  const formatted = await prettier.format(fullCode, {
    parser: "typescript",
    semi: true,
    singleQuote: false,
    trailingComma: "all",
  });

  const filePath = path.join(serverOperationsDir, `${operationId}.ts`);
  await fs.writeFile(filePath, formatted);
}

/**
 * Writes server operations index file
 */
export async function writeServerIndexFile(
  operations: OperationMetadata[],
  serverOperationsDir: string,
): Promise<void> {
  const exports = operations
    .map(
      ({ operationId }) =>
        `export { ${operationId}Wrapper } from "./${operationId}.js";`,
    )
    .join("\n");

  const indexContent = `/* Server operation wrappers */
${exports}

/* Re-export all handlers */
${operations
  .map(
    ({ operationId }) =>
      `export type { ${operationId}Handler } from "./${operationId}.js";`,
  )
  .join("\n")}
`;

  const formatted = await prettier.format(indexContent, {
    parser: "typescript",
    semi: true,
    singleQuote: false,
    trailingComma: "all",
  });

  const filePath = path.join(serverOperationsDir, "index.ts");
  await fs.writeFile(filePath, formatted);
}