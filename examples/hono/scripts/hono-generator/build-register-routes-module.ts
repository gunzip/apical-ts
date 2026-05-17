import { toPascalCase } from "./naming.js";
import type { OperationDefinition } from "./types.js";

export function buildRegisterRoutesModule(operations: OperationDefinition[]) {
  const importLines = operations.map((operation) => {
    const registerFunctionName = `register${toPascalCase(operation.moduleBasename)}Route`;

    return `import { ${registerFunctionName} } from "./operations/${operation.moduleBasename}.ts";`;
  });

  const registerLines = operations.map((operation) => {
    const registerFunctionName = `register${toPascalCase(operation.moduleBasename)}Route`;

    return `  ${registerFunctionName}(app);`;
  });

  const routeDescriptors = operations.map((operation) => {
    return [
      "  {",
      `    method: ${JSON.stringify(operation.method)},`,
      `    path: ${JSON.stringify(operation.honoPath)},`,
      `    operationId: ${JSON.stringify(operation.operationId)},`,
      "  },",
    ].join("\n");
  });

  return [
    'import type { Hono } from "hono";',
    ...importLines,
    "",
    "export const registeredRoutes = [",
    ...routeDescriptors,
    "] as const;",
    "",
    "export function registerGeneratedRoutes<TApp extends Hono>(app: TApp) {",
    ...registerLines,
    "",
    "  return app;",
    "}",
    "",
  ].join("\n");
}
