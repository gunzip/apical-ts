import { toCamelCase } from "./naming.ts";
import type { OperationDefinition } from "./types.ts";

interface BuildMockHandlerModuleOptions {
  mockRuntimeImportDirectory: string;
  operationsImportDirectory: string;
  routesImportDirectory: string;
}

export function buildMockHandlerModule(
  operation: OperationDefinition,
  options: BuildMockHandlerModuleOptions,
) {
  const handlerName = `${toCamelCase(operation.moduleBasename)}Handler`;
  const routeIdentifier = `${toCamelCase(operation.moduleBasename)}Route`;

  return [
    `import { serverRoute as ${routeIdentifier} } from "${options.routesImportDirectory}/${operation.moduleBasename}.ts";`,
    `import { createMockOperationHandler } from "${options.mockRuntimeImportDirectory}";`,
    "",
    `export const ${handlerName} = createMockOperationHandler(${routeIdentifier});`,
    "",
  ].join("\n");
}
