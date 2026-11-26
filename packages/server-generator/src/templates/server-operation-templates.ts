import { sanitizeIdentifier } from "@apical-ts/core-utils";

export type BodyMode = "none" | "optional" | "required";

/*
 * Template parameters for server operation wrapper generation
 */
interface ServerOperationTemplateParams {
  bodyMode: BodyMode;
  functionName: string;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  operationId: string;
  requestContentTypes: string[];
  requestMapTypeName?: string;
  responseMapTypeName?: string;
}

/*
 * Renders the complete server operation wrapper function
 */
export function renderServerOperationWrapper(
  params: ServerOperationTemplateParams,
): string {
  const {
    bodyMode,
    functionName,
    hasHeaders,
    hasPath,
    hasQuery,
    operationId,
    requestContentTypes,
    requestMapTypeName,
    responseMapTypeName,
  } = params;

  const sanitizedId = sanitizeIdentifier(operationId);
  // Must stay aligned with the route generator's collision-avoidance naming.
  const routeResponseType = `${sanitizedId}RouteResponse`;
  const effectiveBodyMode: BodyMode =
    bodyMode !== "none" && requestMapTypeName ? bodyMode : "none";
  const hasAnyParams = hasQuery || hasPath || hasHeaders;
  const parsedBodyTypeName = `${sanitizedId}ParsedBody`;
  const optionalParsedBodyTypeName = `${sanitizedId}OptionalParsedBody`;

  /* Import request map and response type from route metadata */
  const responseTypeImport = responseMapTypeName
    ? `import type { ${routeResponseType} } from "../routes/${sanitizedId}.ts";`
    : "";
  /* Import runtime request map value; use typeof for types */
  const requestMapImport =
    effectiveBodyMode !== "none" && requestMapTypeName
      ? `import { ${requestMapTypeName} } from "../routes/${sanitizedId}.ts";`
      : "";

  /* Import pre-computed server parsed params type to avoid expensive z.infer inference */
  const serverParsedParamsTypeName = `${sanitizedId}ServerParsedParamsType`;
  const parsedParamsTypeImport = hasAnyParams
    ? `import type { ${serverParsedParamsTypeName} } from "../schemas/${sanitizedId}Parameters.ts";`
    : "";

  const validationLogic = renderValidationLogic({
    bodyMode: effectiveBodyMode,
    hasHeaders,
    hasPath,
    hasQuery,
    requestContentTypes,
    requestMapTypeName,
    sanitizedId,
  });

  const { bodyShapeType, parsedBodyTypeDefinitions } = buildBodyTypeDefinitions(
    {
      bodyMode: effectiveBodyMode,
      optionalParsedBodyTypeName,
      parsedBodyTypeName,
      requestMapTypeName,
    },
  );

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
) => Promise<${routeResponseType}>;`;

  const wrapperFunction = `export function ${functionName}(
  handler: ${sanitizedId}Handler,
) {
  return async (req: {
    query: unknown;
    path: unknown;
    headers: unknown;
    body?: unknown;
    contentType?: ${effectiveBodyMode !== "none" && requestMapTypeName ? `keyof ${requestMapTypeName} | (string & {})` : "string"};
  }): Promise<${routeResponseType}> => {
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

function buildBodyTypeDefinitions(options: {
  bodyMode: BodyMode;
  optionalParsedBodyTypeName: string;
  parsedBodyTypeName: string;
  requestMapTypeName: string | undefined;
}): { bodyShapeType: string; parsedBodyTypeDefinitions: string } {
  const {
    bodyMode,
    optionalParsedBodyTypeName,
    parsedBodyTypeName,
    requestMapTypeName,
  } = options;

  if (bodyMode === "none" || !requestMapTypeName) {
    return {
      bodyShapeType: "{ body?: undefined }",
      parsedBodyTypeDefinitions: "",
    };
  }

  const baseParsedBodyType = `type ${parsedBodyTypeName} = {
  [K in keyof ${requestMapTypeName}]: {
    contentType: K;
    body: StandardSchemaV1.InferOutput<${requestMapTypeName}[K]>;
  };
}[keyof ${requestMapTypeName}];`;

  if (bodyMode === "required") {
    return {
      bodyShapeType: parsedBodyTypeName,
      parsedBodyTypeDefinitions: baseParsedBodyType,
    };
  }

  return {
    bodyShapeType: optionalParsedBodyTypeName,
    parsedBodyTypeDefinitions: `${baseParsedBodyType}

type ${optionalParsedBodyTypeName} =
  | ${parsedBodyTypeName}
  | { contentType?: undefined; body?: undefined };`,
  };
}

function renderSuccessReturn(
  paramProps: string[],
  extraProps: string[],
  indent = "  ",
): string {
  const propIndent = `${indent}    `;
  const props = [...paramProps, ...extraProps].map(
    (prop) => `${propIndent}${prop}`,
  );
  return `${indent}return handler({
${indent}  isValid: true,
${indent}  value: {
${props.join(",\n")}
${indent}  },
${indent}});`;
}

/*
 * Renders validation logic for server wrapper
 */
function renderValidationLogic(options: {
  bodyMode: BodyMode;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  requestContentTypes: string[];
  requestMapTypeName: string | undefined;
  sanitizedId: string;
}): string {
  const {
    bodyMode,
    hasHeaders,
    hasPath,
    hasQuery,
    requestContentTypes,
    requestMapTypeName,
    sanitizedId,
  } = options;

  const paramValidations: string[] = [];
  const paramProps: string[] = [];

  if (hasQuery) {
    paramValidations.push(
      `  const queryParse = await validateStandardSchema(${sanitizedId}RouteMetadata.params.shape.query, req.query);`,
      `  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, isValid: false });`,
    );
    paramProps.push(`query: queryParse.value`);
  }

  if (hasPath) {
    paramValidations.push(
      `  const pathParse = await validateStandardSchema(${sanitizedId}RouteMetadata.params.shape.path, req.path);`,
      `  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, isValid: false });`,
    );
    paramProps.push(`path: pathParse.value`);
  }

  if (hasHeaders) {
    paramValidations.push(
      `  const headersParse = await validateStandardSchema(${sanitizedId}RouteMetadata.params.shape.headers, req.headers);`,
      `  if (!headersParse.success) return handler({ kind: "headers-error", error: headersParse.error, isValid: false });`,
    );
    paramProps.push(`headers: headersParse.value`);
  }

  const bodyAndReturnLogic = renderBodyValidationLogic({
    bodyMode,
    paramProps,
    requestContentTypes,
    requestMapTypeName,
  });

  if (paramValidations.length === 0) {
    return bodyAndReturnLogic;
  }

  return `${paramValidations.join("\n")}\n${bodyAndReturnLogic}`;
}

function renderBodyValidationLogic(options: {
  bodyMode: BodyMode;
  paramProps: string[];
  requestContentTypes: string[];
  requestMapTypeName: string | undefined;
}): string {
  const { bodyMode, paramProps, requestContentTypes, requestMapTypeName } =
    options;

  if (bodyMode === "none" || !requestMapTypeName) {
    return renderSuccessReturn(paramProps, ["body: undefined"]);
  }

  const missingBodyBranch =
    bodyMode === "required"
      ? `  if (req.body === undefined) {
    return handler({ kind: "body-error", error: createStandardSchemaValidationError("Request body is required"), isValid: false });
  }`
      : `  if (req.body === undefined) {
${renderSuccessReturn(paramProps, ["contentType: undefined", "body: undefined"], "    ")}
  }`;

  const orderedContentTypes = [
    ...requestContentTypes.filter((ct) => ct.includes(";")),
    ...requestContentTypes.filter((ct) => !ct.includes(";")),
  ];
  const needsMediaType = orderedContentTypes.some((ct) => !ct.includes(";"));
  const mediaTypeDeclaration = needsMediaType
    ? `\n  const mediaType = rawContentType.split(";")[0]?.trim();`
    : "";

  const contentTypeBranches = orderedContentTypes
    .map((ct) => {
      const lit = JSON.stringify(ct);
      const lowerLit = JSON.stringify(ct.toLowerCase());
      const condition = ct.includes(";")
        ? `rawContentType === ${lowerLit}`
        : `mediaType === ${lowerLit}`;
      return `  if (${condition}) {
    const bodyParse = await validateStandardSchema(${requestMapTypeName}[${lit}], req.body);
    if (!bodyParse.success) return handler({ kind: "body-error", error: bodyParse.error, isValid: false });
${renderSuccessReturn(paramProps, [`contentType: ${lit}`, "body: bodyParse.value"], "    ")}
  }`;
    })
    .join("\n");

  return `${missingBodyBranch}
  /* Content type must be provided for request body validation */
  if (!req.contentType) {
    return handler({ kind: "body-error", error: createStandardSchemaValidationError("Content-Type header is required"), isValid: false });
  }
  const rawContentType = req.contentType.trim().toLowerCase();${mediaTypeDeclaration}
${contentTypeBranches}
  /* Unknown content-type: reject */
  return handler({ kind: "body-error", error: createStandardSchemaValidationError(\`Unsupported Content-Type: \${req.contentType}\`), isValid: false });`;
}
