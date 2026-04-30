import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

interface RouteDefinition {
  method: string;
  operationId?: string;
  params?: {
    shape?: Partial<Record<"headers" | "path" | "query", unknown>>;
  };
  path: string;
  requestMap: Record<string, unknown>;
  responseMap: Record<string, Record<string, unknown>>;
}

interface OperationDefinition {
  hasBody: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  honoPath: string;
  method: string;
  moduleBasename: string;
  operationId: string;
  paramNameMap: Record<string, string>;
}

async function generateHonoServer(projectRoot: string) {
  const generatedDirPath = path.join(projectRoot, "generated");
  const generatedRoutesDirPath = path.join(generatedDirPath, "routes");
  const generatedHonoDirPath = path.join(generatedDirPath, "hono");
  const generatedOperationsDirPath = path.join(
    generatedHonoDirPath,
    "operations",
  );
  const generatedRegisterRoutesFilePath = path.join(
    generatedHonoDirPath,
    "register-routes.ts",
  );
  const generatedRuntimeFilePath = path.join(
    generatedHonoDirPath,
    "runtime.ts",
  );

  const operations = await loadOperations(generatedRoutesDirPath);

  await rm(generatedHonoDirPath, { force: true, recursive: true });
  await mkdir(generatedOperationsDirPath, { recursive: true });

  await writeFileIfChanged(generatedRuntimeFilePath, buildRuntimeModule());

  for (const operation of operations) {
    const generatedOperationFilePath = path.join(
      generatedOperationsDirPath,
      `${operation.moduleBasename}.ts`,
    );

    await writeFileIfChanged(
      generatedOperationFilePath,
      buildOperationModule(operation),
    );
  }

  await writeFileIfChanged(
    generatedRegisterRoutesFilePath,
    buildRegisterRoutesFile(operations),
  );
}

function buildOperationModule(operation: OperationDefinition) {
  const registerFunctionName = `register${toPascalCase(operation.moduleBasename)}Route`;
  const routeIdentifier = `${toCamelCase(operation.moduleBasename)}Route`;
  const requestMapName = `${operation.moduleBasename}RequestMap`;
  const mockHandlerName = `${toCamelCase(operation.moduleBasename)}MockHandler`;
  const paramMapName = `${toCamelCase(operation.moduleBasename)}ParamNameMap`;
  const paramMapDeclaration = hasCustomParamNames(operation.paramNameMap)
    ? `const ${paramMapName} = ${JSON.stringify(operation.paramNameMap, null, 2)} as const;\n`
    : "";

  const routeImports = operation.hasBody
    ? `import {\n  ${requestMapName},\n  serverRoute as ${routeIdentifier},\n} from "../../routes/${operation.moduleBasename}.js";`
    : `import { serverRoute as ${routeIdentifier} } from "../../routes/${operation.moduleBasename}.js";`;

  const registrationExpression = buildRegistrationExpression(
    operation.method,
    operation.honoPath,
  );

  return [
    'import type { Context, Hono } from "hono";',
    routeImports,
    'import * as runtime from "../runtime.js";',
    "",
    paramMapDeclaration,
    `const ${mockHandlerName} = runtime.createMockHandler(${routeIdentifier});`,
    "",
    `export function ${registerFunctionName}<TApp extends Hono>(app: TApp) {`,
    `  return ${registrationExpression}async (context) => {`,
    "    const params = await buildParams(context);",
    `    const result = await ${mockHandlerName}(params);`,
    "    return runtime.sendRouteResponse(result);",
    "  });",
    "}",
    "",
    "async function buildParams(context: Context) {",
    ...buildParamsFunctionLines(
      operation,
      routeIdentifier,
      requestMapName,
      paramMapName,
    ),
    "}",
    "",
  ].join("\n");
}

function buildRuntimeModule() {
  return [
    'import type { Context } from "hono";',
    'import * as z from "zod";',
    'import * as zCore from "zod/v4/core";',
    'import { zocker } from "zocker";',
    "",
    "export type RequestMap = Record<string, zCore.$ZodType>;",
    "export type ResponseMap = Record<string, Record<string, zCore.$ZodType>>;",
    "",
    "export interface MockRouteDefinition {",
    "  operationId: string;",
    "  responseMap: ResponseMap;",
    "}",
    "",
    "export interface MockResponse {",
    "  status: number | string;",
    "  contentType?: string;",
    "  data?: unknown;",
    "}",
    "",
    "export interface InvalidRequest {",
    "  error: unknown;",
    "  isValid: false;",
    '  kind: "body-error" | "headers-error" | "path-error" | "query-error";',
    "}",
    "",
    "export interface ValidRequest {",
    "  isValid: true;",
    "  value: Record<string, unknown>;",
    "}",
    "",
    "export type MockHandlerParams = InvalidRequest | ValidRequest;",
    "",
    "export function createMockHandler(route: MockRouteDefinition) {",
    "  return async (params: MockHandlerParams): Promise<MockResponse> => {",
    "    if (!params.isValid) {",
    '      const badRequestResponse = route.responseMap["400"];',
    "",
    "      if (badRequestResponse !== undefined) {",
    "        const contentType = selectContentType(badRequestResponse);",
    "        const schema = badRequestResponse[contentType];",
    "",
    "        if (schema !== undefined) {",
    "          const mockData = generateMockData(schema, route.operationId);",
    "",
    "          return {",
    '            status: "400",',
    "            contentType,",
    "            data: {",
    "              ...(isRecord(mockData) ? mockData : { mockData }),",
    "              details: params.error,",
    "              message: prettifyValidationError(params.error),",
    "            },",
    "          };",
    "        }",
    "      }",
    "",
    "      return {",
    '        status: "400",',
    '        contentType: "application/json",',
    "        data: {",
    '          error: "Bad Request",',
    "          details: params.error,",
    "          message: prettifyValidationError(params.error),",
    "        },",
    "      };",
    "    }",
    "",
    "    const selectedStatus = selectStatus(route.responseMap);",
    "    if (selectedStatus === undefined) {",
    "      return {",
    '        status: "204",',
    '        contentType: "text/plain",',
    "        data: null,",
    "      };",
    "    }",
    "",
    "    const statusResponseMap = route.responseMap[selectedStatus];",
    "    if (statusResponseMap === undefined) {",
    "      return {",
    '        status: "204",',
    '        contentType: "text/plain",',
    "        data: null,",
    "      };",
    "    }",
    "",
    "    const contentType = selectContentType(statusResponseMap);",
    "    const schema = statusResponseMap[contentType];",
    "    if (schema === undefined) {",
    "      return {",
    '        status: "204",',
    '        contentType: "text/plain",',
    "        data: null,",
    "      };",
    "    }",
    "",
    "    return {",
    "      status: selectedStatus,",
    "      contentType,",
    "      data: generateMockData(schema, route.operationId),",
    "    };",
    "  };",
    "}",
    "",
    "export function createValidationError(",
    '  kind: InvalidRequest["kind"],',
    "  error: string | unknown,",
    "): InvalidRequest {",
    "  return {",
    "    error:",
    '      typeof error === "string"',
    '        ? new z.ZodError([{ code: "custom", message: error, path: [] }])',
    "        : error,",
    "    isValid: false,",
    "    kind,",
    "  };",
    "}",
    "",
    "export function extractHeaders(context: Context) {",
    "  return Object.fromEntries(context.req.raw.headers.entries());",
    "}",
    "",
    "export function extractPathParams(",
    "  context: Context,",
    "  paramNameMap?: Record<string, string>,",
    ") {",
    "  const rawParams = context.req.param();",
    "",
    "  if (paramNameMap === undefined) {",
    "    return rawParams;",
    "  }",
    "",
    "  return Object.fromEntries(",
    "    Object.entries(paramNameMap).map(([original, sanitized]) => {",
    "      return [original, rawParams[sanitized]];",
    "    }),",
    "  );",
    "}",
    "",
    "export function extractQueryParams(context: Context) {",
    "  const searchParams = new URL(context.req.url).searchParams;",
    "  const query = new Map<string, string[]>();",
    "",
    "  searchParams.forEach((value, key) => {",
    "    const existingValues = query.get(key) ?? [];",
    "    existingValues.push(value);",
    "    query.set(key, existingValues);",
    "  });",
    "",
    "  return Object.fromEntries(",
    "    Array.from(query.entries()).map(([key, values]) => {",
    "      return [key, values.length === 1 ? values[0] : values];",
    "    }),",
    "  );",
    "}",
    "",
    "export function normalizeContentType(contentType?: string) {",
    '  return contentType?.split(";")[0]?.trim().toLowerCase();',
    "}",
    "",
    "export async function parseRequestBody(context: Context, contentType: string) {",
    "  try {",
    '    if (contentType === "application/json" || contentType.endsWith("+json")) {',
    "      return await context.req.json();",
    "    }",
    "",
    "    if (",
    '      contentType === "application/x-www-form-urlencoded" ||',
    '      contentType === "multipart/form-data"',
    "    ) {",
    "      return await context.req.parseBody();",
    "    }",
    "",
    "    return await context.req.text();",
    "  } catch {",
    "    return undefined;",
    "  }",
    "}",
    "",
    "export function pickRequestBodySchema(",
    "  requestMap: RequestMap,",
    "  contentType: string,",
    ") {",
    "  return requestMap[contentType];",
    "}",
    "",
    "export function safeParseSchema(schema: zCore.$ZodType, input: unknown) {",
    "  return z.safeParse(schema, input);",
    "}",
    "",
    "export function sendRouteResponse(result: MockResponse) {",
    "  const status = toHttpStatus(result.status);",
    "  const headers = new Headers();",
    "",
    "  if (result.contentType !== undefined) {",
    '    headers.set("content-type", result.contentType);',
    "  }",
    "",
    "  if (result.data === undefined || result.data === null) {",
    "    return new Response(null, { headers, status });",
    "  }",
    "",
    '  if (typeof result.data === "string") {',
    "    return new Response(result.data, { headers, status });",
    "  }",
    "",
    '  const contentType = result.contentType ?? "application/json";',
    '  headers.set("content-type", contentType);',
    "",
    "  return new Response(serializeResponseData(result.data), { headers, status });",
    "}",
    "",
    "function generateMockData(schema: zCore.$ZodType, operationId: string) {",
    "  try {",
    "    return zocker(schema).setSeed(123).generate();",
    "  } catch (error) {",
    "    console.error(`Error generating mock for ${operationId}:`, error);",
    "    return { error: `Mock generation failed for ${operationId}` };",
    "  }",
    "}",
    "",
    "function hasIssues(value: unknown): value is {",
    "  issues: Array<{ message: string; path?: PropertyKey[] }>;",
    "} {",
    "  return (",
    '    typeof value === "object" &&',
    "    value !== null &&",
    '    "issues" in value &&',
    "    Array.isArray(value.issues)",
    "  );",
    "}",
    "",
    "function isRecord(value: unknown): value is Record<string, unknown> {",
    '  return typeof value === "object" && value !== null;',
    "}",
    "",
    "function prettifyValidationError(error: unknown) {",
    "  if (hasIssues(error)) {",
    "    return error.issues",
    "      .map((issue) => {",
    "        const path =",
    "          issue.path !== undefined && issue.path.length > 0",
    '            ? issue.path.join(".")',
    '            : "root";',
    "",
    "        return `${path}: ${issue.message}`;",
    "      })",
    '      .join("; ");',
    "  }",
    "",
    "  if (error instanceof Error) {",
    "    return error.message;",
    "  }",
    "",
    '  if (typeof error === "string") {',
    "    return error;",
    "  }",
    "",
    '  return "Invalid request parameters";',
    "}",
    "",
    "function selectContentType(statusResponseMap: Record<string, zCore.$ZodType>) {",
    '  return statusResponseMap["application/json"] !== undefined',
    '    ? "application/json"',
    '    : (Object.keys(statusResponseMap)[0] ?? "application/json");',
    "}",
    "",
    "function selectStatus(responseMap: ResponseMap) {",
    "  const statusCodes = Object.keys(responseMap).filter((status) => {",
    '    return status !== "default";',
    "  });",
    "",
    '  const successCodes = statusCodes.filter((status) => status.startsWith("2"));',
    "  if (successCodes.length > 0) {",
    "    return successCodes[0];",
    "  }",
    "",
    '  const redirectCodes = statusCodes.filter((status) => status.startsWith("3"));',
    "  if (redirectCodes.length > 0) {",
    "    return redirectCodes[0];",
    "  }",
    "",
    "  if (statusCodes.length > 0) {",
    "    return statusCodes[0];",
    "  }",
    "",
    '  return responseMap.default === undefined ? undefined : "default";',
    "}",
    "",
    "function serializeResponseData(data: unknown) {",
    "  return JSON.stringify(data, (_, value: unknown) => {",
    '    return typeof value === "bigint" ? value.toString() : value;',
    "  });",
    "}",
    "",
    "function toHttpStatus(status: number | string) {",
    '  if (typeof status === "number") {',
    "    return Number.isFinite(status) ? status : 500;",
    "  }",
    "",
    '  if (status === "default") {',
    "    return 500;",
    "  }",
    "",
    "  const parsedStatus = Number.parseInt(status, 10);",
    "  return Number.isNaN(parsedStatus) ? 500 : parsedStatus;",
    "}",
    "",
  ].join("\n");
}

function buildParamsFunctionLines(
  operation: OperationDefinition,
  routeIdentifier: string,
  requestMapName: string,
  paramMapName: string,
) {
  const lines: string[] = [];

  if (operation.hasPath) {
    const pathParamsCall = hasCustomParamNames(operation.paramNameMap)
      ? `runtime.extractPathParams(context, ${paramMapName})`
      : "runtime.extractPathParams(context)";

    lines.push(
      `  const pathParse = ${routeIdentifier}.params.shape.path.safeParse(`,
      `    ${pathParamsCall},`,
      "  );",
      "  if (!pathParse.success) {",
      '    return runtime.createValidationError("path-error", pathParse.error);',
      "  }",
      "",
    );
  }

  if (operation.hasQuery) {
    lines.push(
      `  const queryParse = ${routeIdentifier}.params.shape.query.safeParse(`,
      "    runtime.extractQueryParams(context),",
      "  );",
      "  if (!queryParse.success) {",
      '    return runtime.createValidationError("query-error", queryParse.error);',
      "  }",
      "",
    );
  }

  if (operation.hasHeaders) {
    lines.push(
      `  const headersParse = ${routeIdentifier}.params.shape.headers.safeParse(`,
      "    runtime.extractHeaders(context),",
      "  );",
      "  if (!headersParse.success) {",
      '    return runtime.createValidationError("headers-error", headersParse.error);',
      "  }",
      "",
    );
  }

  if (operation.hasBody) {
    lines.push(
      '  const contentType = runtime.normalizeContentType(context.req.header("content-type"));',
      "  let body: unknown = undefined;",
      "",
      "  if (contentType !== undefined) {",
      `    const schema = runtime.pickRequestBodySchema(${requestMapName}, contentType);`,
      "    if (schema === undefined) {",
      "      return runtime.createValidationError(",
      '        "body-error",',
      "        `Unsupported Content-Type: ${contentType}`,",
      "      );",
      "    }",
      "",
      "    const rawBody = await runtime.parseRequestBody(context, contentType);",
      "    const bodyParse = runtime.safeParseSchema(schema, rawBody);",
      "    if (!bodyParse.success) {",
      '      return runtime.createValidationError("body-error", bodyParse.error);',
      "    }",
      "",
      "    body = bodyParse.data;",
      "  }",
      "",
    );
  }

  const valueProperties: string[] = [];
  if (operation.hasPath) {
    valueProperties.push("      path: pathParse.data,");
  }
  if (operation.hasQuery) {
    valueProperties.push("      query: queryParse.data,");
  }
  if (operation.hasHeaders) {
    valueProperties.push("      headers: headersParse.data,");
  }
  if (operation.hasBody) {
    valueProperties.push("      body,");
    valueProperties.push("      contentType,");
  }

  lines.push(
    "  return {",
    "    isValid: true as const,",
    valueProperties.length > 0 ? "    value: {" : "    value: {},",
    ...valueProperties,
    ...(valueProperties.length > 0 ? ["    },"] : []),
    "  };",
  );

  return lines;
}

function buildRegisterRoutesFile(operations: OperationDefinition[]) {
  const importLines = operations.map((operation) => {
    const registerFunctionName = `register${toPascalCase(operation.moduleBasename)}Route`;

    return `import { ${registerFunctionName} } from "./operations/${operation.moduleBasename}.js";`;
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

function buildRegistrationExpression(method: string, honoPath: string) {
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
    return `app.${normalizedMethod}(${JSON.stringify(honoPath)}, `;
  }

  return `app.on(${JSON.stringify(method.toUpperCase())}, ${JSON.stringify(honoPath)}, `;
}

function createFallbackOperationId(method: string, routePath: string) {
  return toCamelCase(
    `${method} ${routePath
      .replaceAll("{", " ")
      .replaceAll("}", " ")
      .replaceAll("/", " ")}`,
  );
}

function hasCustomParamNames(paramNameMap: Record<string, string>) {
  return Object.entries(paramNameMap).some(([original, sanitized]) => {
    return original !== sanitized;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRouteDefinition(value: unknown): value is RouteDefinition {
  return (
    isRecord(value) &&
    typeof value.method === "string" &&
    typeof value.path === "string" &&
    isRecord(value.requestMap) &&
    isRecord(value.responseMap)
  );
}

async function loadOperations(generatedRoutesDirPath: string) {
  const routeFileNames = (await readdir(generatedRoutesDirPath))
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort();

  const operations: OperationDefinition[] = [];
  const seenOperationIds = new Set<string>();

  for (const routeFileName of routeFileNames) {
    const moduleBasename = routeFileName.slice(0, -3);
    const routeModuleFilePath = path.join(
      generatedRoutesDirPath,
      routeFileName,
    );
    const routeModuleUrl = new URL(
      `?generatedAt=${Date.now()}`,
      pathToFileURL(routeModuleFilePath),
    );
    const routeModule = await import(routeModuleUrl.href);
    const route = routeModule.serverRoute;

    if (!isRouteDefinition(route)) {
      throw new Error(
        `Route module ${routeFileName} does not export a supported serverRoute definition.`,
      );
    }

    const operationId =
      route.operationId ?? createFallbackOperationId(route.method, route.path);

    if (seenOperationIds.has(operationId)) {
      throw new Error(`Duplicate operationId detected: ${operationId}`);
    }

    seenOperationIds.add(operationId);

    const parameterShape = route.params?.shape ?? {};
    const { honoPath, paramNameMap } = toHonoPath(route.path);

    operations.push({
      hasBody: Object.keys(route.requestMap).length > 0,
      hasHeaders: "headers" in parameterShape,
      hasPath: "path" in parameterShape,
      hasQuery: "query" in parameterShape,
      honoPath,
      method: route.method,
      moduleBasename,
      operationId,
      paramNameMap,
    });
  }

  return operations;
}

async function readTextFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function sanitizeParamName(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_]/g, "_");
}

function splitIntoWords(value: string) {
  const normalizedValue = value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  return normalizedValue === ""
    ? []
    : normalizedValue.split(/\s+/).filter((segment) => segment.length > 0);
}

function toCamelCase(value: string) {
  const [firstSegment = "operation", ...remainingSegments] =
    splitIntoWords(value);

  return [
    firstSegment.toLowerCase(),
    ...remainingSegments.map((segment) => capitalize(segment)),
  ].join("");
}

function toHonoPath(routePath: string) {
  const paramNameMap: Record<string, string> = {};
  const honoPath = routePath.replaceAll(/\{([^}]+)\}/g, (_, raw) => {
    const sanitized = sanitizeParamName(raw);
    paramNameMap[raw] = sanitized;
    return `:${sanitized}`;
  });

  return {
    honoPath,
    paramNameMap,
  };
}

function toPascalCase(value: string) {
  const segments = splitIntoWords(value);

  if (segments.length === 0) {
    return "Operation";
  }

  return segments.map((segment) => capitalize(segment)).join("");
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

async function writeFileIfChanged(filePath: string, content: string) {
  const existingContent = await readTextFile(filePath);

  if (existingContent === content) {
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
await generateHonoServer(projectRoot);
