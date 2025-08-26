import type { ParameterGroups } from "../../client-generator/parameters.js";
import { sanitizeIdentifier } from "../../schema-generator/utils.js";
import type { ServerOperationMetadata } from "../operation-wrapper-generator.js";

/**
 * Template parameters for server operation wrapper generation
 */
export interface ServerOperationTemplateParams {
  functionName: string;
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
  const { contentTypeMaps } = metadata.bodyInfo;

  /* Add imports for response schemas */
  contentTypeMaps.typeImports.forEach((imp) => typeImports.add(imp));

  /* Build response union type */
  const responseEntries: string[] = [];
  
  // We need to extract response information from the operation
  // For now, create a placeholder - this will be enhanced
  const operationId = sanitizeIdentifier(metadata.operationId);
  const responseTypeName = `${operationId}Response`;
  
  return `export type ${responseTypeName} = 
  | { status: 200; contentType: "application/json"; data: unknown }
  | { status: 404; contentType: "text/plain"; data: string };`;
}

/**
 * Renders Zod schema definitions for parameters
 */
function renderParameterSchemas(
  operationId: string,
  parameterGroups: ParameterGroups,
): string {
  const schemas: string[] = [];
  const sanitizedId = sanitizeIdentifier(operationId);

  /* Query schema */
  if (parameterGroups.queryParams.length > 0) {
    const queryProps = parameterGroups.queryParams
      .map((p) => `${sanitizeIdentifier(p.name)}: z.string()`)
      .join(", ");
    schemas.push(
      `const ${sanitizedId}QuerySchema = z.object({ ${queryProps} });`,
    );
    schemas.push(
      `type ${sanitizedId}Query = z.infer<typeof ${sanitizedId}QuerySchema>;`,
    );
  } else {
    schemas.push(`const ${sanitizedId}QuerySchema = z.object({});`);
    schemas.push(
      `type ${sanitizedId}Query = z.infer<typeof ${sanitizedId}QuerySchema>;`,
    );
  }

  /* Path schema */
  if (parameterGroups.pathParams.length > 0) {
    const pathProps = parameterGroups.pathParams
      .map((p) => `${sanitizeIdentifier(p.name)}: z.string()`)
      .join(", ");
    schemas.push(
      `const ${sanitizedId}PathSchema = z.object({ ${pathProps} });`,
    );
    schemas.push(
      `type ${sanitizedId}Path = z.infer<typeof ${sanitizedId}PathSchema>;`,
    );
  } else {
    schemas.push(`const ${sanitizedId}PathSchema = z.object({});`);
    schemas.push(
      `type ${sanitizedId}Path = z.infer<typeof ${sanitizedId}PathSchema>;`,
    );
  }

  /* Headers schema */
  if (parameterGroups.headerParams.length > 0) {
    const headerProps = parameterGroups.headerParams
      .map((p) => `"${p.name}": z.string()`)
      .join(", ");
    schemas.push(
      `const ${sanitizedId}HeadersSchema = z.object({ ${headerProps} });`,
    );
    schemas.push(
      `type ${sanitizedId}Headers = z.infer<typeof ${sanitizedId}HeadersSchema>;`,
    );
  } else {
    schemas.push(`const ${sanitizedId}HeadersSchema = z.object({});`);
    schemas.push(
      `type ${sanitizedId}Headers = z.infer<typeof ${sanitizedId}HeadersSchema>;`,
    );
  }

  return schemas.join("\n");
}

/**
 * Renders validation logic for server wrapper
 */
function renderValidationLogic(
  operationId: string,
  requestMapTypeName?: string,
): string {
  const sanitizedId = sanitizeIdentifier(operationId);
  
  /* Determine body type based on whether we have a request map */
  const bodyType = requestMapTypeName
    ? `z.infer<(typeof ${requestMapTypeName})["application/json"]>`
    : "undefined";

  return `  const queryParse = ${sanitizedId}QuerySchema.safeParse(req.query);
  if (!queryParse.success) return handler({ type: "query_error", error: queryParse.error });

  const pathParse = ${sanitizedId}PathSchema.safeParse(req.path);
  if (!pathParse.success) return handler({ type: "path_error", error: pathParse.error });

  const headersParse = ${sanitizedId}HeadersSchema.safeParse(req.headers);
  if (!headersParse.success) return handler({ type: "headers_error", error: headersParse.error });

  let parsedBody: ${bodyType} | undefined = undefined;
  if (req.body !== undefined && req.contentType && ${requestMapTypeName || "false"}) {
    const schema = ${requestMapTypeName ? `${requestMapTypeName}[req.contentType]` : "undefined"};
    if (schema) {
      const bodyParse = schema.safeParse(req.body);
      if (!bodyParse.success) return handler({ type: "body_error", error: bodyParse.error });
      parsedBody = bodyParse.data;
    }
  }

  return handler({
    type: "ok",
    value: { 
      query: queryParse.data, 
      path: pathParse.data, 
      headers: headersParse.data,
      body: parsedBody 
    },
  });`;
}

/**
 * Renders the complete server operation wrapper function
 */
export function renderServerOperationWrapper(
  params: ServerOperationTemplateParams,
): string {
  const {
    functionName,
    operationId,
    parameterGroups,
    requestMapCode,
    requestMapTypeName,
    responseMapCode,
    responseMapTypeName,
    summary,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);
  const parameterSchemas = renderParameterSchemas(operationId, parameterGroups);
  const validationLogic = renderValidationLogic(operationId, requestMapTypeName);

  /* Build handler and parsed params types */
  const responseType = `${sanitizedId}Response`;
  const bodyType = requestMapTypeName
    ? `z.infer<(typeof ${requestMapTypeName})["application/json"]>`
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