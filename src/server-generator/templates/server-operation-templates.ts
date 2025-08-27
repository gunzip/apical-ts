import type { ParameterGroups } from "../../client-generator/models/parameter-models.js";
import type { ServerOperationMetadata } from "../operation-wrapper-generator.js";

import { extractResponseContentTypes } from "../../client-generator/operation-extractor.js";
import { resolveSchemaTypeName } from "../../client-generator/responses.js";
import { sanitizeIdentifier } from "../../schema-generator/utils.js";
import { generateParameterSchemas } from "../../shared/parameter-schemas.js";

/**
 * Template parameters for server operation wrapper generation
 */
export interface ServerOperationTemplateParams {
  functionName: string;
  /** True if the operation defines a request body (even if only one content type) */
  hasBody: boolean;
  operationId: string;
  parameterGroups: ParameterGroups;
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
  const operationId = sanitizeIdentifier(metadata.operationId);
  const responseTypeName = `${operationId}Response`;
  const responseEntries: string[] = [];

  // Reuse client extractor to gather responses with content types
  const responseGroups = extractResponseContentTypes(metadata.operation);

  for (const group of responseGroups) {
    for (const mapping of group.contentTypes) {
      const schemaType = resolveSchemaTypeName(
        mapping.schema,
        metadata.operationId,
        `${group.statusCode}Response`,
        typeImports,
      );
      responseEntries.push(
        `  | { status: ${group.statusCode}; contentType: "${mapping.contentType}"; data: ${schemaType} }`,
      );
    }
  }

  // Fallback for operations without explicit content
  if (responseEntries.length === 0) {
    responseEntries.push(
      `  | { status: 200; contentType: "application/json"; data: unknown }`,
    );
  }

  return `export type ${responseTypeName} =${responseEntries.join("\n")};`;
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
    parameterGroups,
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
  | { type: "query_error"; error: z.ZodError }
  | { type: "path_error"; error: z.ZodError }
  | { type: "headers_error"; error: z.ZodError }
  | { type: "body_error"; error: z.ZodError };`;

  const parsedParamsType = `type ${sanitizedId}ParsedParams = {
  query: ${sanitizedId}Query;
  path: ${sanitizedId}Path;
  headers: ${sanitizedId}Headers;
  body?: ${bodyType};
};`;

  const handlerType = `export type ${sanitizedId}Handler = (
  params: { type: "ok"; value: ${sanitizedId}ParsedParams } | ${sanitizedId}ValidationError,
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
  /* Use shared parameter schema generation logic */
  const result = generateParameterSchemas(operationId, parameterGroups, {
    strictValidation: false,
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
  if (!queryParse.success) return handler({ type: "query_error", error: queryParse.error });

  const pathParse = ${sanitizedId}PathSchema.safeParse(req.path);
  if (!pathParse.success) return handler({ type: "path_error", error: pathParse.error });

  const headersParse = ${sanitizedId}HeadersSchema.safeParse(req.headers);
  if (!headersParse.success) return handler({ type: "headers_error", error: headersParse.error });`;

  const bodyLogic = requestMapTypeName
    ? `
  let parsedBody: ${bodyType} | undefined = undefined;
  if (req.body !== undefined && req.contentType) {
    const mapRef = ${requestMapTypeName} as Record<string, z.ZodTypeAny | undefined>;
    const schema = mapRef[req.contentType as string];
    if (schema) {
      const bodyParse = schema.safeParse(req.body);
      if (!bodyParse.success) return handler({ type: "body_error", error: bodyParse.error });
      parsedBody = bodyParse.data as ${bodyType};
    } else {
      /* Unknown content-type fallback: accept any */
      const bodyParse = z.any().safeParse(req.body);
      if (!bodyParse.success) return handler({ type: "body_error", error: bodyParse.error });
      parsedBody = bodyParse.data as ${bodyType};
    }
  }`
    : hasBody
      ? `
  let parsedBody: unknown | undefined = undefined;
  if (req.body !== undefined) {
    const bodyParse = z.any().safeParse(req.body);
    if (!bodyParse.success) return handler({ type: "body_error", error: bodyParse.error });
    parsedBody = bodyParse.data as unknown;
  }`
      : `
  let parsedBody: undefined | undefined = undefined;`;

  const tail = `
  return handler({
    type: "ok",
    value: { 
      query: queryParse.data, 
      path: pathParse.data, 
      headers: headersParse.data,
      body: parsedBody 
    },
  });`;

  return shared + bodyLogic + tail;
}
