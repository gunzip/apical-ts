import type { OpenAPIObject } from "openapi3-ts/oas31";

import type { ServerOperationMetadata } from "../operation-wrapper-generator.js";

import { ImportManager } from "../../core-generator/import-types.js";
import { sanitizeIdentifier } from "../../schema-generator/utils.js";
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
  /** Original OpenAPI path including path parameters (e.g., "/pets/{petId}") */
  pathKey: string;
  requestMapTypeName?: string;
  responseMapTypeName?: string;
  summary?: string;
}

/**
 * Builds server request map for operations with request bodies
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

  return `export const ${mapName} = ${fixedMapType} as const;
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
