import type { OpenAPIObject } from "openapi3-ts/oas31";

import type { ParameterGroups } from "../../client-generator/models/parameter-models.js";
import type { ServerOperationMetadata } from "../operation-wrapper-generator.js";

import { ImportManager } from "../../core-generator/import-types.js";
import { sanitizeIdentifier } from "../../schema-generator/utils.js";
import { generateParameterSchemas } from "../../shared/parameter-schemas.js";
import { generateResponseMap } from "../../shared/response-maps.js";
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
}

/**
 * Builds server request map for operations with multiple content types
 */
export function buildServerRequestMap(
  metadata: ServerOperationMetadata,
  importManager: ImportManager,
): string {
  if (!metadata.bodyInfo.shouldGenerateRequestMap) return "";

  const { serverRequestBodyMap } = metadata.bodyInfo;
  const mapName = metadata.bodyInfo.requestMapTypeName;

  /* Add imports for request schemas */
  for (const typeImport of serverRequestBodyMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  /* Convert the client generator format (with semicolons) to object literal format (with commas) */
  const fixedMapType = serverRequestBodyMap.requestMapType.replace(/;/g, ",");

  return `export const ${mapName} = ${fixedMapType};
export type ${mapName} = typeof ${mapName};`;
}

/**
 * Builds server response map for operations
 */
export function buildServerResponseMap(
  metadata: ServerOperationMetadata,
  importManager: ImportManager,
  doc: OpenAPIObject,
): string {
  /* Create a temporary Set to collect type imports */
  const typeImports = new Set<string>();

  /* Generate response union type using existing logic */
  const unionResult = generateResponseUnion(
    metadata.operation,
    metadata.operationId,
    typeImports,
    doc, // Pass document for response reference resolution
  );

  /* Generate response map using shared logic */
  const responseMapResult = generateResponseMap(
    metadata.operation,
    metadata.operationId,
    typeImports,
    doc, // Pass document for response reference resolution
    {}, // Use standard schemas for server responses
  );

  /* Add type imports to ImportManager */
  for (const typeImport of typeImports) {
    importManager.addSchemaImport(typeImport);
  }
  for (const typeImport of responseMapResult.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  /* Generate response map constant and type like client generator */
  const responseMapName = `${sanitizeIdentifier(metadata.operationId)}ResponseMap`;

  let responseMapCode = "";
  if (responseMapResult.shouldGenerateResponseMap) {
    responseMapCode = `export const ${responseMapName} = ${responseMapResult.responseMapType} as const;
export type ${responseMapName} = typeof ${responseMapName};`;
  } else {
    responseMapCode = `export const ${responseMapName} = {} as const;
export type ${responseMapName} = typeof ${responseMapName};`;
  }

  /* Combine both the union type and the response map */
  return `${responseMapCode}\n\n${unionResult.unionTypeDefinition}`;
}

/**
 * Renders the complete server operation wrapper function
 */
export function renderServerOperationWrapper(
  params: ServerOperationTemplateParams,
  importManager: ImportManager,
): string {
  const {
    functionName,
    hasBody,
    method,
    operationId,
    pathKey,
    requestMapCode,
    requestMapTypeName,
    responseMapCode,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);

  /* Generate inline parameter schemas with server-specific transformations */
  const parameterSchemas = generateInlineParameterSchemas(
    operationId,
    params.parameterGroups,
    importManager,
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
  | { kind: "query-error"; error: z.ZodError; isValid: false }
  | { kind: "path-error"; error: z.ZodError; isValid: false }
  | { kind: "headers-error"; error: z.ZodError; isValid: false }
  | { kind: "body-error"; error: z.ZodError; isValid: false };`;

  const parsedParamsType = `type ${sanitizedId}ParsedParams = {
  query: z.infer<typeof ${sanitizedId}QuerySchema>;
  path: z.infer<typeof ${sanitizedId}PathSchema>;
  headers: z.infer<typeof ${sanitizedId}HeadersSchema>;
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

  /* Include responseMap in the route function return */
  const responseMapFieldValue = responseMapTypeName
    ? `${sanitizedId}ResponseMap`
    : "{}";
  const routeFunction = `export function route() {
  return {
    path: "${pathKey}",
    method: "${method}",
    wrapper: ${functionName},
    operationId: "${sanitizedId}",
    requestMap: ${requestMapTypeName || "{}"},
    responseMap: ${responseMapFieldValue},
  } as const;
}`;

  /* Combine all parts */
  const parts = [
    `import { z } from "zod";`,
    parameterSchemas,
    requestMapCode,
    responseMapCode,
    validationErrorType,
    parsedParamsType,
    handlerType,
    wrapperFunction,
    routeFunction,
  ].filter(Boolean);

  return parts.join("\n\n");
}

/**
 * Generates inline parameter schemas with server-specific transformations
 */
function generateInlineParameterSchemas(
  operationId: string,
  parameterGroups: ParameterGroups,
  importManager: ImportManager,
): string {
  const result = generateParameterSchemas(operationId, parameterGroups, {
    /* Server requires coercion and lowercase headers */
    coercePrimitives: true,
    lowercaseHeaderKeys: true,
  });

  /* Add any type imports from schema generation to ImportManager */
  for (const typeImport of result.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

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
  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, isValid: false });

  const pathParse = ${sanitizedId}PathSchema.safeParse(req.path);
  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, isValid: false });

  const headersParse = ${sanitizedId}HeadersSchema.safeParse(req.headers);
  if (!headersParse.success) return handler({ kind: "headers-error", error: headersParse.error, isValid: false });`;

  const bodyLogic = requestMapTypeName
    ? `
  let parsedBody: ${bodyType} | undefined = undefined;
  if (req.body !== undefined && req.contentType) {
    const schema = ${requestMapTypeName}[req.contentType];
    if (schema) {
      const bodyParse = schema.safeParse(req.body);
      if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
      parsedBody = bodyParse.data as ${bodyType};
    } else {
      /* Unknown content-type fallback: accept any */
      const bodyParse = z.any().safeParse(req.body);
      if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
      parsedBody = bodyParse.data as ${bodyType};
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
