import type { ParameterGroups } from "../../client-generator/models/parameter-models.js";
import type { ServerOperationMetadata } from "../operation-wrapper-generator.js";

import { sanitizeIdentifier } from "../../schema-generator/utils.js";
import { generateParameterSchemas } from "../../shared/parameter-schemas.js";
import { generateResponseUnion } from "../../shared/response-union-generator.js";

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
  parameterGroups: ParameterGroups;
  /** Original OpenAPI path including path parameters (e.g., "/pets/{petId}") */
  pathKey: string;
  requestMapCode: string;
  requestMapTypeName?: string;
  responseMapCode: string;
  responseMapTypeName?: string;
  summary?: string;
  typeImports: Set<string>;
}

/**
 * Builds server request map for operations with multiple content types
 */
export function buildServerRequestMap(
  metadata: ServerOperationMetadata,
  typeImports: Set<string>,
): string {
  if (!metadata.bodyInfo.shouldGenerateRequestMap) return "";

  const { contentTypeMaps } = metadata.bodyInfo;
  const mapName = metadata.bodyInfo.requestMapTypeName;

  /* Add imports for request schemas */
  contentTypeMaps.typeImports.forEach((imp) => typeImports.add(imp));

  /* Convert the client generator format (with semicolons) to object literal format (with commas) */
  const fixedMapType = contentTypeMaps.requestMapType.replace(/;/g, ",");

  return `export const ${mapName} = ${fixedMapType};
export type ${mapName} = typeof ${mapName};`;
}

/**
 * Builds server response map for operations
 */
export function buildServerResponseMap(
  metadata: ServerOperationMetadata,
  typeImports: Set<string>,
): string {
  /* Use shared response union generation to ensure consistency with client generator */
  const result = generateResponseUnion(
    metadata.operation,
    metadata.operationId,
    typeImports,
  );

  /* Return the union type definition */
  return result.unionTypeDefinition;
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
    method,
    operationId,
    parameterGroups,
    pathKey,
    requestMapCode,
    requestMapTypeName,
    responseMapCode,
    // responseMapTypeName,
    // summary,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);
  const parameterSchemas = renderParameterSchemas(
    operationId,
    parameterGroups,
    params.typeImports,
  );
  const validationLogic = renderValidationLogic(
    operationId,
    requestMapTypeName,
    hasBody,
  );

  /* Build handler and parsed params types */
  const responseType = `${sanitizedId}Response`;
  const bodyType = requestMapTypeName
    ? `z.infer<(typeof ${requestMapTypeName})["application/json"]>`
    : hasBody
      ? "unknown"
      : "undefined";

  const validationErrorType = `type ${sanitizedId}ValidationError =
  | { kind: "query-error"; error: z.ZodError; success: false }
  | { kind: "path-error"; error: z.ZodError; success: false }
  | { kind: "headers-error"; error: z.ZodError; success: false }
  | { kind: "body-error"; error: z.ZodError; success: false };`;

  const parsedParamsType = `type ${sanitizedId}ParsedParams = {
  query: ${sanitizedId}Query;
  path: ${sanitizedId}Path;
  headers: ${sanitizedId}Headers;
  body?: ${bodyType};
};`;

  const handlerType = `export type ${sanitizedId}Handler = (
  params: { success: true; value: ${sanitizedId}ParsedParams } | ${sanitizedId}ValidationError,
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

  const routeFunction = `export function route() {
  return { path: "${pathKey}", method: "${method}" } as const;
}`;

  /* Combine all parts */
  const parts = [
    `import { z } from "zod";`,
    requestMapCode,
    responseMapCode,
    parameterSchemas,
    validationErrorType,
    parsedParamsType,
    handlerType,
    wrapperFunction,
    routeFunction,
  ].filter(Boolean);

  return parts.join("\n\n");
}

/**
 * Renders Zod schema definitions for parameters
 */
function renderParameterSchemas(
  operationId: string,
  parameterGroups: ParameterGroups,
  typeImports: Set<string>,
): string {
  /* Use shared parameter schema generation logic with strict validation for server input */
  const result = generateParameterSchemas(operationId, parameterGroups, {
    strictValidation: true,
  });

  /* Merge type imports */
  result.typeImports.forEach((imp) => typeImports.add(imp));

  return result.schemaCode;
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
    ? `z.infer<(typeof ${requestMapTypeName})["application/json"]>`
    : "undefined";
  const shared = `  const queryParse = ${sanitizedId}QuerySchema.safeParse(req.query);
  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, success: false });

  const pathParse = ${sanitizedId}PathSchema.safeParse(req.path);
  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, success: false });

  const headersParse = ${sanitizedId}HeadersSchema.safeParse(req.headers);
  if (!headersParse.success) return handler({ kind: "headers-error", error: headersParse.error, success: false });`;

  const bodyLogic = requestMapTypeName
    ? `
  let parsedBody: ${bodyType} | undefined = undefined;
  if (req.body !== undefined && req.contentType) {
    const schema = ${requestMapTypeName}[req.contentType];
    if (schema) {
      const bodyParse = schema.strict().safeParse(req.body);
      if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, success: false });
      parsedBody = bodyParse.data as ${bodyType};
    } else {
      /* Unknown content-type fallback: accept any */
      const bodyParse = z.any().safeParse(req.body);
      if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, success: false });
      parsedBody = bodyParse.data as ${bodyType};
    }
  }`
    : hasBody
      ? `
  let parsedBody: unknown | undefined = undefined;
  if (req.body !== undefined) {
    const bodyParse = z.any().safeParse(req.body);
    if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, success: false });
    parsedBody = bodyParse.data as unknown;
  }`
      : `
  let parsedBody: undefined | undefined = undefined;`;

  const tail = `
  return handler({
    success: true,
    value: {
      query: queryParse.data,
      path: pathParse.data,
      headers: headersParse.data,
      body: parsedBody
    },
  });`;

  return shared + bodyLogic + tail;
}
