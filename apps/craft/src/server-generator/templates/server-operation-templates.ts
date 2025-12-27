import { sanitizeIdentifier } from "../../schema-generator/utils.js";

/**
 * Template parameters for server operation wrapper generation
 */
export interface ServerOperationTemplateParams {
  functionName: string;
  /** True if the operation defines a request body (even if only one content type) */
  hasBody: boolean;
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
    operationId,
    requestMapTypeName,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);

  /* Import request/response maps and response type from route metadata */
  const responseTypeImport = responseMapTypeName
    ? `import type { ${sanitizedId}Response } from "../routes/${sanitizedId}.js";`
    : "";
  /* Import runtime values and types together to avoid duplication */
  const requestMapImport = requestMapTypeName
    ? `import { ${requestMapTypeName}, type ${requestMapTypeName} as ${requestMapTypeName}Type } from "../routes/${sanitizedId}.js";`
    : "";
  const responseMapImport = responseMapTypeName
    ? `import { ${responseMapTypeName}, type ${responseMapTypeName} as ${responseMapTypeName}Type } from "../routes/${sanitizedId}.js";`
    : "";

  const validationLogic = renderValidationLogic(
    operationId,
    requestMapTypeName,
    hasBody,
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

  /* Define server-specific parsed params type with server transformations applied */
  const parsedParamsType = `type ${sanitizedId}ParsedParams = {
  query: z.infer<typeof ${sanitizedId}RouteMetadata.params.query>;
  path: z.infer<typeof ${sanitizedId}RouteMetadata.params.path>;
  headers: z.infer<typeof ${sanitizedId}RouteMetadata.params.headers>;
  body?: ${bodyType};
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
): string {
  const sanitizedId = sanitizeIdentifier(operationId);
  const bodyType = requestMapTypeName
    ? `z.infer<(typeof ${requestMapTypeName})[keyof typeof ${requestMapTypeName}]>`
    : "undefined";
  const shared = `  const queryParse = ${sanitizedId}RouteMetadata.params.query.safeParse(req.query);
  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, isValid: false });

  const pathParse = ${sanitizedId}RouteMetadata.params.path.safeParse(req.path);
  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, isValid: false });

  const headersParse = ${sanitizedId}RouteMetadata.params.headers.safeParse(req.headers);
  if (!headersParse.success) return handler({ kind: "headers-error", error: headersParse.error, isValid: false });`;

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

  const tail = `
  return handler({
    isValid: true,
    value: {
      query: queryParse.data,
      path: pathParse.data,
      headers: headersParse.data,
      body: parsedBody
    },
  });`;

  return shared + bodyLogic + tail;
}
