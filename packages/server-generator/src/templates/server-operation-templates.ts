import { sanitizeIdentifier } from "@apical-ts/core-utils";

/*
 * Template parameters for server operation wrapper generation
 */
interface ServerOperationTemplateParams {
  functionName: string;
  /* True if the operation defines a request body (even if only one content type) */
  hasBody: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  isBodyRequired?: boolean;
  /* HTTP method in lowercase (e.g., "get", "post") */
  method: string;
  operationId: string;
  /* Original OpenAPI path including path parameters (e.g., "/pets/{petId}") */
  pathKey: string;
  requestMapTypeName?: string;
  responseMapTypeName?: string;
  summary?: string;
}

/*
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
    isBodyRequired = false,
    operationId,
    requestMapTypeName,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);
  // Must stay aligned with the route generator's collision-avoidance naming.
  const routeResponseType = `${sanitizedId}RouteResponse`;

  /* Import request map and response type from route metadata */
  const responseTypeImport = responseMapTypeName
    ? `import type { ${routeResponseType} } from "../routes/${sanitizedId}.ts";`
    : "";
  /* Import runtime request map value; use typeof for types */
  const requestMapImport = requestMapTypeName
    ? `import { ${requestMapTypeName} } from "../routes/${sanitizedId}.ts";`
    : "";

  /* Import pre-computed server parsed params type to avoid expensive z.infer inference */
  const hasAnyParams = hasQuery || hasPath || hasHeaders;
  const serverParsedParamsTypeName = `${sanitizedId}ServerParsedParamsType`;
  const parsedParamsTypeImport = hasAnyParams
    ? `import type { ${serverParsedParamsTypeName} } from "../schemas/${sanitizedId}Parameters.ts";`
    : "";

  const validationLogic = renderValidationLogic({
    hasBody,
    hasHeaders,
    hasPath,
    hasQuery,
    isBodyRequired,
    operationId,
    requestMapTypeName,
  });

  /* Build handler and parsed params types */
  const responseType = routeResponseType;
  const parsedBodyTypeName = `${sanitizedId}ParsedBody`;
  const optionalParsedBodyTypeName = `${sanitizedId}OptionalParsedBody`;

  const parsedBodyTypeDefinitions = requestMapTypeName
    ? isBodyRequired
      ? `type ${parsedBodyTypeName} = {
  [K in keyof ${requestMapTypeName}]: {
    contentType: K;
    body: StandardSchemaV1.InferOutput<${requestMapTypeName}[K]>;
  };
}[keyof ${requestMapTypeName}];`
      : `type ${parsedBodyTypeName} = {
  [K in keyof ${requestMapTypeName}]: {
    contentType: K;
    body: StandardSchemaV1.InferOutput<${requestMapTypeName}[K]>;
  };
}[keyof ${requestMapTypeName}];

type ${optionalParsedBodyTypeName} =
  | ${parsedBodyTypeName}
  | { contentType?: undefined; body?: undefined };`
    : "";

  const bodyShapeType = requestMapTypeName
    ? isBodyRequired
      ? parsedBodyTypeName
      : optionalParsedBodyTypeName
    : hasBody
      ? isBodyRequired
        ? "{ body: unknown }"
        : "{ body?: unknown }"
      : "{ body?: undefined }";

  const validationErrorType = `type ${sanitizedId}ValidationError =
  | { kind: "query-error"; error: StandardSchemaValidationError; isValid: false }
  | { kind: "path-error"; error: StandardSchemaValidationError; isValid: false }
  | { kind: "headers-error"; error: StandardSchemaValidationError; isValid: false }
  | { kind: "body-error"; error: StandardSchemaValidationError; isValid: false };`;

  /*
   * Use pre-computed parsed params type imported from the parameter schema file,
   * intersecting it with the discriminated body/contentType shape.
   */
  const parsedParamsType = hasAnyParams
    ? `type ${sanitizedId}ParsedParams = ${serverParsedParamsTypeName} & ${bodyShapeType};`
    : `type ${sanitizedId}ParsedParams = ${bodyShapeType};`;

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
    contentType?: ${requestMapTypeName ? `keyof ${requestMapTypeName} | (string & {})` : "string"};
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
    parsedParamsTypeImport,
    validationErrorType,
    parsedBodyTypeDefinitions,
    parsedParamsType,
    handlerType,
    wrapperFunction,
    routeFunction,
  ].filter(Boolean);

  return parts.join("\n\n");
}

/*
 * Renders validation logic for server wrapper
 */
function renderValidationLogic(options: {
  hasBody: boolean;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  isBodyRequired: boolean;
  operationId: string;
  requestMapTypeName: string | undefined;
}): string {
  const {
    hasBody,
    hasHeaders,
    hasPath,
    hasQuery,
    isBodyRequired,
    operationId,
    requestMapTypeName,
  } = options;
  const sanitizedId = sanitizeIdentifier(operationId);
  const parsedBodyTypeName = `${sanitizedId}ParsedBody`;
  const optionalParsedBodyTypeName = `${sanitizedId}OptionalParsedBody`;
  const hasAnyParams = hasQuery || hasPath || hasHeaders;

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

  const bodyLogic = renderBodyValidationLogic({
    hasBody,
    isBodyRequired,
    optionalParsedBodyTypeName,
    parsedBodyTypeName,
    requestMapTypeName,
  });

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

  let valueExpression: string;
  if (requestMapTypeName) {
    if (hasAnyParams) {
      valueExpression = `{
${returnValueProps.join(",\n")},
      ...parsedBody,
    } as ${sanitizedId}ParsedParams`;
    } else {
      valueExpression = `parsedBody`;
    }
  } else {
    returnValueProps.push(`      body: parsedBody`);
    valueExpression = `{
${returnValueProps.join(",\n")}
    }`;
  }

  const tail = `
  return handler({
    isValid: true,
    value: ${valueExpression},
  });`;

  return shared + bodyLogic + tail;
}

function renderBodyValidationLogic(options: {
  hasBody: boolean;
  isBodyRequired: boolean;
  optionalParsedBodyTypeName: string;
  parsedBodyTypeName: string;
  requestMapTypeName: string | undefined;
}): string {
  const {
    hasBody,
    isBodyRequired,
    optionalParsedBodyTypeName,
    parsedBodyTypeName,
    requestMapTypeName,
  } = options;

  if (!requestMapTypeName) {
    if (!hasBody) {
      return `
  let parsedBody: undefined | undefined = undefined;`;
    }
    if (isBodyRequired) {
      return `
  if (req.body === undefined) {
    return handler({ kind: "body-error", error: createStandardSchemaValidationError("Request body is required"), isValid: false });
  }
  const parsedBody: unknown = req.body;`;
    }
    return `
  let parsedBody: unknown | undefined = undefined;
  if (req.body !== undefined) {
    parsedBody = req.body;
  }`;
  }

  const requiredGuard = isBodyRequired
    ? `
  if (req.body === undefined) {
    return handler({ kind: "body-error", error: createStandardSchemaValidationError("Request body is required"), isValid: false });
  }`
    : "";

  const declaration = isBodyRequired
    ? `
  let parsedBody: ${parsedBodyTypeName};`
    : `
  let parsedBody: ${optionalParsedBodyTypeName} = { contentType: undefined, body: undefined };`;

  const bodyCheckOpen = isBodyRequired
    ? ""
    : "\n  if (req.body !== undefined) {";
  const bodyCheckClose = isBodyRequired ? "" : "\n  }";
  const indent = isBodyRequired ? "  " : "    ";

  return `${requiredGuard}${declaration}${bodyCheckOpen}
${indent}/* Content type must be provided for request body validation */
${indent}if (!req.contentType) {
${indent}  return handler({ kind: "body-error", error: createStandardSchemaValidationError("Content-Type header is required"), isValid: false });
${indent}}
${indent}const rawContentType = req.contentType;
${indent}const mediaType = rawContentType.split(";")[0]?.trim();
${indent}const matchedContentType = (
${indent}  Object.prototype.hasOwnProperty.call(${requestMapTypeName}, rawContentType)
${indent}    ? rawContentType
${indent}    : mediaType && Object.prototype.hasOwnProperty.call(${requestMapTypeName}, mediaType)
${indent}      ? mediaType
${indent}      : undefined
${indent}) as keyof ${requestMapTypeName} | undefined;
${indent}if (matchedContentType) {
${indent}  const schema = ${requestMapTypeName}[matchedContentType];
${indent}  const bodyParse = await validateStandardSchema(schema, req.body);
${indent}  if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
${indent}  parsedBody = {
${indent}    contentType: matchedContentType,
${indent}    body: bodyParse.value,
${indent}  } as ${parsedBodyTypeName};
${indent}} else {
${indent}  /* Unknown content-type: reject */
${indent}  return handler({ kind: "body-error", error: createStandardSchemaValidationError(\`Unsupported Content-Type: \${req.contentType}\`), isValid: false });
${indent}}${bodyCheckClose}`;
}
