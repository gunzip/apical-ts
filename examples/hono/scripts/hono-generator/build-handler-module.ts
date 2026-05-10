import { toCamelCase, toPascalCase } from "./naming.js";
import type { OperationDefinition } from "./types.js";

interface BuildHandlerModuleOptions {
  operationsImportDirectory: string;
}

export function buildHandlerModule(
  operation: OperationDefinition,
  options: BuildHandlerModuleOptions,
) {
  const handlerName = `${toCamelCase(operation.moduleBasename)}Handler`;
  const handlerTypeName = `${toPascalCase(operation.moduleBasename)}Handler`;

  return [
    `import type { ${handlerTypeName} } from "${options.operationsImportDirectory}/${operation.moduleBasename}.js";`,
    "",
    `export const ${handlerName}: ${handlerTypeName} = async (_input, _context) => {`,
    `  throw new Error(${JSON.stringify(`Implement ${handlerName} for ${operation.operationId}.`)});`,
    "};",
    "",
  ].join("\n");
}
