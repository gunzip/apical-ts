import { toCamelCase, toPascalCase } from "./naming.js";
import type { OperationDefinition } from "./types.js";

export function buildUsecaseModule(operation: OperationDefinition) {
  const routeIdentifier = `${toCamelCase(operation.moduleBasename)}Route`;
  const usecaseFunctionName = `${toCamelCase(operation.moduleBasename)}Usecase`;
  const usecaseInputTypeName = `${toPascalCase(operation.moduleBasename)}UsecaseInput`;
  const mockUsecaseName = `${toCamelCase(operation.moduleBasename)}MockUsecase`;

  return [
    `import { serverRoute as ${routeIdentifier} } from "../../routes/${operation.moduleBasename}.js";`,
    'import * as runtime from "../runtime.js";',
    "",
    `export type ${usecaseInputTypeName} = runtime.GeneratedOperationInput<typeof ${routeIdentifier}>;`,
    "",
    `const ${mockUsecaseName} = runtime.createMockUsecase(${routeIdentifier});`,
    "",
    `export async function ${usecaseFunctionName}(input: ${usecaseInputTypeName}) {`,
    `  return ${mockUsecaseName}(input);`,
    "}",
    "",
  ].join("\n");
}
