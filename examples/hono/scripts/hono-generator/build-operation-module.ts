import { toCamelCase, toPascalCase } from "./naming.js";
import { hasCustomParamNames } from "./route-utils.js";
import type { BodyValidatorDefinition, OperationDefinition } from "./types.js";

interface BuildOperationModuleOptions {
  handlersImportDirectory: string;
  routesImportDirectory: string;
}

function buildInputProperties(
  operation: OperationDefinition,
  contextName: string,
) {
  const properties: string[] = [];

  if (operation.hasPath) {
    properties.push(`      path: ${contextName}.req.valid("param"),`);
  }

  if (operation.hasQuery) {
    properties.push(`      query: ${contextName}.req.valid("query"),`);
  }

  if (operation.hasHeaders) {
    properties.push(`      headers: ${contextName}.req.valid("header"),`);
  }

  if (operation.hasBody) {
    properties.push(
      operation.bodyValidators.length > 0
        ? `      body: runtime.readValidatedRequestBody(${contextName}, contentType),`
        : "      body: undefined,",
    );
    properties.push("      contentType,");
  }

  return properties;
}

function buildRegistrationStart(method: string) {
  const normalizedMethod = method.toLowerCase();
  const supportedMethods = new Set([
    "delete",
    "get",
    "head",
    "options",
    "patch",
    "post",
    "put",
  ]);

  if (supportedMethods.has(normalizedMethod)) {
    return `app.${normalizedMethod}(`;
  }

  return "app.on(";
}

function buildRegistrationArgumentLines(
  operation: OperationDefinition,
  middlewareExpressions: string[],
) {
  const normalizedMethod = operation.method.toLowerCase();
  const supportedMethods = new Set([
    "delete",
    "get",
    "head",
    "options",
    "patch",
    "post",
    "put",
  ]);

  const methodArguments = supportedMethods.has(normalizedMethod)
    ? []
    : [JSON.stringify(operation.method.toUpperCase())];

  return [
    ...methodArguments,
    JSON.stringify(operation.honoPath),
    ...middlewareExpressions,
  ].map((argument) => {
    return `    ${argument},`;
  });
}

function buildBodyValidatorName(
  operation: OperationDefinition,
  bodyValidator: BodyValidatorDefinition,
) {
  return `${toCamelCase(operation.moduleBasename)}${toPascalCase(bodyValidator.contentType)}BodyValidator`;
}

function buildBodyValidatorDeclarations(
  operation: OperationDefinition,
  requestMapName: string,
  routeIdentifier: string,
  validationHookName: string,
) {
  return operation.bodyValidators.flatMap((bodyValidator, index) => {
    const validatorName = buildBodyValidatorName(operation, bodyValidator);

    return [
      `const ${validatorName} = runtime.createConditionalValidator(`,
      `  ${JSON.stringify(bodyValidator.contentType)},`,
      `  zValidator(${JSON.stringify(bodyValidator.target)}, ${requestMapName}[${JSON.stringify(bodyValidator.contentType)}], ${validationHookName}),`,
      `  ${routeIdentifier},`,
      ");",
      ...(index < operation.bodyValidators.length - 1 ? [""] : []),
    ];
  });
}

function buildValidationMiddlewareExpressions(
  operation: OperationDefinition,
  routeIdentifier: string,
  requestMapName: string,
  validationHookName: string,
  paramMapName: string,
) {
  const expressions: string[] = [];

  if (operation.hasPath) {
    const paramOptions = hasCustomParamNames(operation.paramNameMap)
      ? `, runtime.createParamValidationOptions(${paramMapName})`
      : "";

    expressions.push(
      `zValidator("param", ${routeIdentifier}.params.shape.path, ${validationHookName}${paramOptions})`,
    );
  }

  if (operation.hasQuery) {
    expressions.push(
      `zValidator("query", ${routeIdentifier}.params.shape.query, ${validationHookName})`,
    );
  }

  if (operation.hasHeaders) {
    expressions.push(
      `zValidator("header", ${routeIdentifier}.params.shape.headers, ${validationHookName})`,
    );
  }

  if (operation.hasBody) {
    expressions.push(
      `runtime.createUnsupportedContentTypeMiddleware(${requestMapName}, ${routeIdentifier})`,
    );
    expressions.push(
      ...operation.bodyValidators.map((bodyValidator) => {
        return buildBodyValidatorName(operation, bodyValidator);
      }),
    );
  }

  return expressions;
}

function buildInlineHandlerLines(
  operation: OperationDefinition,
  routeIdentifier: string,
  handlerName: string,
  handlerInputTypeName: string,
) {
  const contextName = "context";
  const contextType = `runtime.GeneratedOperationContext<typeof ${routeIdentifier}>`;
  const inputProperties = buildInputProperties(operation, contextName);

  return [
    "    async (",
    `      ${contextName}: ${contextType},`,
    "    ) => {",
    ...(operation.hasBody
      ? [
          `      const contentType = runtime.normalizeContentType(${contextName}.req.header("content-type"));`,
          "",
        ]
      : []),
    ...(inputProperties.length > 0
      ? [
          "      const input = {",
          ...inputProperties,
          `      } satisfies ${handlerInputTypeName};`,
        ]
      : [`      const input = {} satisfies ${handlerInputTypeName};`]),
    "",
    `      const result = await ${handlerName}(input, context);`,
    "",
    "      return runtime.sendRouteResponse(result);",
    "    },",
  ];
}

export function buildOperationModule(
  operation: OperationDefinition,
  options: BuildOperationModuleOptions,
) {
  const registerFunctionName = `register${toPascalCase(operation.moduleBasename)}Route`;
  const routeIdentifier = `${toCamelCase(operation.moduleBasename)}Route`;
  const routeResponseTypeName = `${operation.moduleBasename}RouteResponse`;
  const requestMapName = `${operation.moduleBasename}RequestMap`;
  const validationHookName = `${toCamelCase(operation.moduleBasename)}ValidationHook`;
  const handlerName = `${toCamelCase(operation.moduleBasename)}Handler`;
  const handlerInputTypeName = `${toPascalCase(operation.moduleBasename)}HandlerInput`;
  const handlerContextTypeName = `${toPascalCase(operation.moduleBasename)}HandlerContext`;
  const handlerResultTypeName = `${toPascalCase(operation.moduleBasename)}HandlerResult`;
  const handlerTypeName = `${toPascalCase(operation.moduleBasename)}Handler`;
  const paramMapName = `${toCamelCase(operation.moduleBasename)}ParamNameMap`;
  const usesZValidator =
    operation.hasHeaders ||
    operation.hasPath ||
    operation.hasQuery ||
    operation.bodyValidators.length > 0;
  const middlewareExpressions = buildValidationMiddlewareExpressions(
    operation,
    routeIdentifier,
    requestMapName,
    validationHookName,
    paramMapName,
  );

  return [
    ...(usesZValidator
      ? ['import { zValidator } from "@hono/zod-validator";']
      : []),
    'import type { Hono } from "hono";',
    operation.hasBody
      ? `import {\n  ${requestMapName},\n  serverRoute as ${routeIdentifier},\n  type ${routeResponseTypeName},\n} from "${options.routesImportDirectory}/${operation.moduleBasename}.js";`
      : `import {\n  serverRoute as ${routeIdentifier},\n  type ${routeResponseTypeName},\n} from "${options.routesImportDirectory}/${operation.moduleBasename}.js";`,
    `import { ${handlerName} } from "${options.handlersImportDirectory}/${operation.moduleBasename}.js";`,
    'import * as runtime from "../runtime.js";',
    "",
    ...(hasCustomParamNames(operation.paramNameMap)
      ? [
          `const ${paramMapName} = ${JSON.stringify(operation.paramNameMap, null, 2)} as const;`,
          "",
        ]
      : []),
    ...(usesZValidator
      ? [
          `const ${validationHookName} = runtime.createValidationHook(${routeIdentifier});`,
          "",
        ]
      : []),
    ...(operation.bodyValidators.length > 0
      ? [
          ...buildBodyValidatorDeclarations(
            operation,
            requestMapName,
            routeIdentifier,
            validationHookName,
          ),
          "",
        ]
      : []),
    `export type ${handlerInputTypeName} = runtime.GeneratedOperationInput<typeof ${routeIdentifier}>;`,
    `export type ${handlerContextTypeName} = runtime.GeneratedOperationContext<typeof ${routeIdentifier}>;`,
    `export type ${handlerResultTypeName} = ${routeResponseTypeName};`,
    `export type ${handlerTypeName} = runtime.GeneratedOperationHandler<typeof ${routeIdentifier}, ${handlerResultTypeName}>;`,
    "",
    `export function ${registerFunctionName}<TApp extends Hono>(app: TApp) {`,
    `  return ${buildRegistrationStart(operation.method)}`,
    ...buildRegistrationArgumentLines(operation, middlewareExpressions),
    ...buildInlineHandlerLines(
      operation,
      routeIdentifier,
      handlerName,
      handlerInputTypeName,
    ),
    "  );",
    "}",
    "",
  ].join("\n");
}
