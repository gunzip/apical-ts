import { sanitizeIdentifier } from "../../schema-generator/utils.js";

/**
 * Template parameters for server operation wrapper generation
 */
export interface ServerOperationTemplateParams {
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

  /* Import request/response maps and response type from route metadata */
  const responseTypeImport = responseMapTypeName
    ? `import type { ${sanitizedId}Response } from "../routes/${sanitizedId}.js";`
    : "";
  /* Import runtime request/response map values; use typeof for types */
  const requestMapImport = requestMapTypeName
    ? `import { ${requestMapTypeName} } from "../routes/${sanitizedId}.js";`
    : "";
  const responseMapImport = responseMapTypeName
    ? `import { ${responseMapTypeName} } from "../routes/${sanitizedId}.js";`
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
  const responseType = `${sanitizedId}Response`;
  const bodyType = requestMapTypeName
    ? `z.infer<(typeof ${requestMapTypeName})[keyof typeof ${requestMapTypeName}]>`
    : hasBody
      ? "unknown"
      : "undefined";

  const validationErrorType = `type ${sanitizedId}ValidationError =
  | { kind: "query-error"; error: z.ZodError; isValid: false }
  | { kind: "path-error"; error: z.ZodError; isValid: false }
  | { kind: "headers-error"; error: z.ZodError; isValid: false }
  | { kind: "body-error"; error: z.ZodError; isValid: false };`;

  /* Extract params type from serverRoute.params - build dynamically based on which params exist */
  const parsedParamsTypeProps: string[] = [];
  if (hasQuery) {
    parsedParamsTypeProps.push(
      `  query?: z.infer<typeof ${sanitizedId}RouteMetadata.params.shape.query>;`,
    );
  }
  if (hasPath) {
    parsedParamsTypeProps.push(
      `  path: z.infer<typeof ${sanitizedId}RouteMetadata.params.shape.path>;`,
    );
  }
  if (hasHeaders) {
    parsedParamsTypeProps.push(
      `  headers?: z.infer<typeof ${sanitizedId}RouteMetadata.params.shape.headers>;`,
    );
  }
  parsedParamsTypeProps.push(`  body?: ${bodyType};`);

  const parsedParamsType = `type ${sanitizedId}ParsedParams = {
${parsedParamsTypeProps.join("\n")}
};`;

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
    `import * as z from "zod";`,
    `import { serverRoute as ${sanitizedId}RouteMetadata } from "../routes/${sanitizedId}.js";`,
    responseTypeImport,
    requestMapImport,
    responseMapImport,
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
    ? `z.infer<(typeof ${requestMapTypeName})[keyof typeof ${requestMapTypeName}]>`
    : "undefined";

  /* Build parameter validation conditionally */
  const paramValidations: string[] = [];

  if (hasQuery) {
    paramValidations.push(
      `  const queryParse = ${sanitizedId}RouteMetadata.params.shape.query.safeParse(req.query);`,
      `  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, isValid: false });`,
    );
  }

  if (hasPath) {
    paramValidations.push(
      `  const pathParse = ${sanitizedId}RouteMetadata.params.shape.path.safeParse(req.path);`,
      `  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, isValid: false });`,
    );
  }

  if (hasHeaders) {
    paramValidations.push(
      `  const headersParse = ${sanitizedId}RouteMetadata.params.shape.headers.safeParse(req.headers);`,
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
      return handler({ kind: "body-error", error: new z.ZodError([{ code: "custom", message: "Content-Type header is required", path: [] }]), isValid: false });
    }
    const schema = ${requestMapTypeName}[req.contentType];
    if (schema) {
      const bodyParse = schema.safeParse(req.body);
      if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
      parsedBody = bodyParse.data as ${bodyType};
    } else {
      /* Unknown content-type: reject */
      return handler({ kind: "body-error", error: new z.ZodError([{ code: "custom", message: \`Unsupported Content-Type: \${req.contentType}\`, path: [] }]), isValid: false });
    }
  }`
    : hasBody
      ? `
  let parsedBody: unknown | undefined = undefined;
  if (req.body !== undefined) {
    const bodyParse = z.any().safeParse(req.body);
    if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
    parsedBody = bodyParse.data as unknown;
  }`
      : `
  let parsedBody: undefined | undefined = undefined;`;

  /* Build return value object dynamically based on which parameters exist */
  const returnValueProps: string[] = [];
  if (hasQuery) {
    returnValueProps.push(`      query: queryParse.data`);
  }
  if (hasPath) {
    returnValueProps.push(`      path: pathParse.data`);
  }
  if (hasHeaders) {
    returnValueProps.push(`      headers: headersParse.data`);
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
