import { sanitizeIdentifier } from "@apical-ts/core-utils";

/**
 * Template parameters for server operation wrapper generation
 */
interface ServerOperationTemplateParams {
  functionName: string;
  /** True if the operation defines a request body (even if only one content type) */
  hasBody: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  /** HTTP method in lowercase (e.g., "get", "post") */
  method: string;
  operationId: string;
  /** Original OpenAPI path including path parameters (e.g., "/pets/{petId}") */
  pathKey: string;
  requestMapTypeName?: string;
  responseMapTypeName?: string;
  summary?: string;
}

/**
 * Renders the complete server operation wrapper function
 */
export function renderServerOperationWrapper(
  params: ServerOperationTemplateParams,
): string {
  const {
    functionName,
    hasBody,
    hasHeaders,
    hasPath,
    hasQuery,
    operationId,
    requestMapTypeName,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);
  // Must stay aligned with the route generator's collision-avoidance naming.
  const routeResponseType = `${sanitizedId}RouteResponse`;

  /* Import request/response maps and response type from route metadata */
  const responseTypeImport = responseMapTypeName
    ? `import type { ${routeResponseType} } from "../routes/${sanitizedId}.ts";`
    : "";
  /* Import runtime request/response map values; use typeof for types */
  const requestMapImport = requestMapTypeName
    ? `import { ${requestMapTypeName} } from "../routes/${sanitizedId}.ts";`
    : "";
  const responseMapImport = responseMapTypeName
    ? `import { ${responseMapTypeName} } from "../routes/${sanitizedId}.ts";`
    : "";

  /* Import pre-computed server parsed params type to avoid expensive z.infer inference */
  const hasAnyParams = hasQuery || hasPath || hasHeaders;
  const serverParsedParamsTypeName = `${sanitizedId}ServerParsedParamsType`;
  const parsedParamsTypeImport = hasAnyParams
    ? `import type { ${serverParsedParamsTypeName} } from "../schemas/${sanitizedId}Parameters.ts";`
    : "";

  const validationLogic = renderValidationLogic(
    operationId,
    requestMapTypeName,
    hasBody,
    hasQuery,
    hasPath,
    hasHeaders,
  );

  /* Build handler and parsed params types */
  const responseType = routeResponseType;
  const bodyType = requestMapTypeName
    ? `StandardSchemaV1.InferOutput<(typeof ${requestMapTypeName})[keyof typeof ${requestMapTypeName}]>`
    : hasBody
      ? "unknown"
      : "undefined";

  const validationErrorType = `type ${sanitizedId}ValidationError =
  | { kind: "query-error"; error: StandardSchemaValidationError; isValid: false }
  | { kind: "path-error"; error: StandardSchemaValidationError; isValid: false }
  | { kind: "headers-error"; error: StandardSchemaValidationError; isValid: false }
  | { kind: "body-error"; error: StandardSchemaValidationError; isValid: false };`;

  /*
   * Use pre-computed parsed params type imported from the parameter schema file,
   * extending it only with the body type. When no params exist, use body-only shape.
   */
  const parsedParamsType = hasAnyParams
    ? `type ${sanitizedId}ParsedParams = ${serverParsedParamsTypeName} & { body?: ${bodyType} };`
    : `type ${sanitizedId}ParsedParams = { body?: ${bodyType} };`;

  const handlerType = `export type ${sanitizedId}Handler = (
  params: { isValid: true; value: ${sanitizedId}ParsedParams } | ${sanitizedId}ValidationError,
) => Promise<${responseType}>;`;

  const wrapperFunction = `export function ${functionName}(
  handler: ${sanitizedId}Handler,
) {
  return async (req: {
    query: unknown;
    path: unknown;
    headers: unknown;
    body?: unknown;
    contentType?: ${requestMapTypeName ? `keyof ${requestMapTypeName}` : "string"};
  }): Promise<${responseType}> => {
${validationLogic}
  };
}`;

  /* Import route metadata from routes directory and spread with wrapper */
  const routeFunction = `export function route() {
  return {
    ...${sanitizedId}RouteMetadata,
    wrapper: ${functionName},
  } as const;
}`;

  /* Combine all parts */
  const parts = [
    `import type { StandardSchemaV1 } from "@standard-schema/spec";`,
    `import { createStandardSchemaValidationError, type StandardSchemaValidationError, validateStandardSchema } from "../standard-schema.ts";`,
    `import { serverRoute as ${sanitizedId}RouteMetadata } from "../routes/${sanitizedId}.ts";`,
    responseTypeImport,
    requestMapImport,
    responseMapImport,
    parsedParamsTypeImport,
    validationErrorType,
    parsedParamsType,
    handlerType,
    wrapperFunction,
    routeFunction,
  ].filter(Boolean);

  return parts.join("\n\n");
}

/**
 * Renders validation logic for server wrapper
 */
function renderValidationLogic(
  operationId: string,
  requestMapTypeName: string | undefined,
  hasBody: boolean | undefined,
  hasQuery: boolean,
  hasPath: boolean,
  hasHeaders: boolean,
): string {
  const sanitizedId = sanitizeIdentifier(operationId);
  const bodyType = requestMapTypeName
    ? `StandardSchemaV1.InferOutput<(typeof ${requestMapTypeName})[keyof typeof ${requestMapTypeName}]>`
    : "undefined";

  /* Build parameter validation conditionally */
  const paramValidations: string[] = [];

  if (hasQuery) {
    paramValidations.push(
      `  const queryParse = await validateStandardSchema(${sanitizedId}RouteMetadata.params.shape.query, req.query);`,
      `  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, isValid: false });`,
    );
  }

  if (hasPath) {
    paramValidations.push(
      `  const pathParse = await validateStandardSchema(${sanitizedId}RouteMetadata.params.shape.path, req.path);`,
      `  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, isValid: false });`,
    );
  }

  if (hasHeaders) {
    paramValidations.push(
      `  const headersParse = await validateStandardSchema(${sanitizedId}RouteMetadata.params.shape.headers, req.headers);`,
      `  if (!headersParse.success) return handler({ kind: "headers-error", error: headersParse.error, isValid: false });`,
    );
  }

  const shared = paramValidations.join("\n");

  const bodyLogic = requestMapTypeName
    ? `
  let parsedBody: ${bodyType} | undefined = undefined;
  if (req.body !== undefined) {
    /* Content type must be provided for request body validation */
    if (!req.contentType) {
      return handler({ kind: "body-error", error: createStandardSchemaValidationError("Content-Type header is required"), isValid: false });
    }
    const schema = ${requestMapTypeName}[req.contentType];
    if (schema) {
      const bodyParse = await validateStandardSchema(schema, req.body);
      if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
      parsedBody = bodyParse.value as ${bodyType};
    } else {
      /* Unknown content-type: reject */
      return handler({ kind: "body-error", error: createStandardSchemaValidationError(\`Unsupported Content-Type: \${req.contentType}\`), isValid: false });
    }
  }`
    : hasBody
      ? `
  let parsedBody: unknown | undefined = undefined;
  if (req.body !== undefined) {
    parsedBody = req.body as unknown;
  }`
      : `
  let parsedBody: undefined | undefined = undefined;`;

  /* Build return value object dynamically based on which parameters exist */
  const returnValueProps: string[] = [];
  if (hasQuery) {
    returnValueProps.push(`      query: queryParse.value`);
  }
  if (hasPath) {
    returnValueProps.push(`      path: pathParse.value`);
  }
  if (hasHeaders) {
    returnValueProps.push(`      headers: headersParse.value`);
  }
  returnValueProps.push(`      body: parsedBody`);

  const tail = `
  return handler({
    isValid: true,
    value: {
${returnValueProps.join(",\n")}
    },
  });`;

  return shared + bodyLogic + tail;
}
