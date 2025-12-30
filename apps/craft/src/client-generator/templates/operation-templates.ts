import type { ImportManager } from "../../core-generator/import-types.js";
import type { extractParameterGroups } from "../../shared/parameter-utils.js";
import type { getOperationSecuritySchemes } from "../../shared/security-utils.js";
import type { resolveRequestBodyType } from "../request-body.js";
import type {
  generateContentTypeMaps,
  ResponseHandlerResult,
} from "../responses.js";

import { sanitizeIdentifier } from "../../schema-generator/utils.js";

/* TypeScript rendering functions for operation code generation */

export interface ContentTypeMapsConfig {
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
  requestMapTypeName: string;
  responseMapTypeName: string;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
}

export type GenericParamsConfig = ContentTypeMapsConfig & {
  initialReturnType: string;
};

export interface GenericParamsResult {
  genericParams: string;
  updatedReturnType: string;
}

/* Renders the complete TypeScript function code from structured metadata */
export interface OperationFunctionRenderConfig {
  functionBodyCode: string;
  functionName: string;
  genericParams: string;
  parameterDeclaration: string;
  /* Raw interface for first parameter (used in overload signatures without destructuring) */
  parameterInterface: string;
  responseMapTypeName?: string;
  summary: string;
  typeAliases: string;
  updatedReturnType: string;
}

/* Data structure representing operation metadata extracted from OpenAPI specification */
export interface OperationMetadata {
  authHeaders: string[];
  bodyInfo: ContentTypeMapsConfig & {
    bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined;
    requestContentType: string | undefined;
    requestContentTypes: string[];
  };
  functionBodyCode: string;
  functionName: string;
  hasBody: boolean;
  importManager: ImportManager;
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
  operationName: string;
  operationSecurityHeaders: ReturnType<typeof getOperationSecuritySchemes>;
  overridesSecurity: boolean;
  parameterGroups: ReturnType<typeof extractParameterGroups>;
  parameterStructures: {
    destructuredParams: string;
    paramsInterface: string;
  };
  responseHandlers: ResponseHandlerResult;
  summary: string;
}

export interface ParameterDeclarationConfig {
  destructuredParams: string;
  paramsInterface: string;
}

/*
 * Creates generic parameter list for dynamic force validation and content-type selection.
 * Example output (after removal of forceValidation generic): <TRequestContentType extends keyof MyOpRequestMap = "application/json", TResponseContentType extends keyof MyOpResponseMap = "application/json">
 * Returns both the generic parameter string and the adjusted return type with conditional types for force validation.
 */
export function buildGenericParams(
  config: GenericParamsConfig,
): GenericParamsResult {
  const genericParts: string[] = [];

  /* Always include TForceValidation parameter for dynamic force validation */
  genericParts.push("TForceValidation extends boolean = true");

  if (config.shouldGenerateRequestMap) {
    const defaultReq =
      config.contentTypeMaps.defaultRequestContentType || "application/json";
    genericParts.push(
      `TRequestContentType extends keyof ${config.requestMapTypeName} = "${defaultReq}"`,
    );
  }
  if (config.shouldGenerateResponseMap) {
    const defaultResp =
      config.contentTypeMaps.defaultResponseContentType || "application/json";
    /* Collect all nested content-type keys from the response map. Using keyof on the union of value objects produces never; mapped type flattens them. */
    genericParts.push(
      `TResponseContentType extends { [K in keyof ${config.responseMapTypeName}]: keyof ${config.responseMapTypeName}[K]; }[keyof ${config.responseMapTypeName}] = "${defaultResp}"`,
    );
  }

  const genericParams = `<${genericParts.join(", ")}>`;

  /* Return the original return type since response analysis already handles conditional types */
  const updatedReturnType = config.initialReturnType;

  return { genericParams, updatedReturnType };
}

/*
 * Produces the function's first parameter declaration.
 * Special case: empty destructuring + empty interface => provide default {} to keep valid signature.
 */
export function buildParameterDeclaration(
  config: ParameterDeclarationConfig,
): string {
  if (config.destructuredParams === "{}" && config.paramsInterface === "{}") {
    return "{}: {} = {}";
  }
  return `${config.destructuredParams}: ${config.paramsInterface}`;
}

/**
 * Builds type aliases by importing from route files instead of regenerating them.
 * This is the new approach that consumes route metadata.
 */
export function buildTypeAliasesFromRoute(config: {
  bodyTypeName?: string;
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
  hasBody: boolean;
  hasHeaderParams: boolean;
  hasPathParams: boolean;
  hasQueryParams: boolean;
  hasRequestMap: boolean;
  hasResponseMap: boolean;
  importManager: ImportManager;
  isBodyOptional: boolean;
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
  operationId: string;
  requestMapTypeName: string;
  responseMapTypeName: string;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
}): string {
  const sanitizedId = sanitizeIdentifier(config.operationId);
  const requestMapName = sanitizedId + "RequestMap";
  const responseMapName = sanitizedId + "ResponseMap";

  /* Import route metadata */
  config.importManager.addRouteImport(
    sanitizedId,
    requestMapName,
    responseMapName,
  );
  config.importManager.addClientRouteImport(sanitizedId);

  const hasAnyParams =
    config.hasPathParams || config.hasQueryParams || config.hasHeaderParams;
  const hasAdditionalProps =
    config.hasBody || config.hasRequestMap || config.hasResponseMap;

  let typeAliases = "";
  const paramsTypeName = `${config.operationId.charAt(0).toUpperCase() + config.operationId.slice(1)}Params`;
  const clientRouteName = `${sanitizedId}ClientRoute`;
  const genericParams =
    config.hasRequestMap || config.hasResponseMap
      ? buildGenericTypeParams(config)
      : "";

  /* Build params type */
  if (hasAnyParams && hasAdditionalProps) {
    /* Params + body/contentType: use intersection */
    const baseType = `z.infer<NonNullable<typeof ${clientRouteName}.params>>`;
    const additionalProps = buildAdditionalProperties(config);
    typeAliases += `type ${paramsTypeName}${genericParams} = ${baseType} & {\n  ${additionalProps.join(";\n  ")};\n};\n\n`;
  } else if (hasAnyParams) {
    /* Only params */
    typeAliases += `type ${paramsTypeName} = z.infer<NonNullable<typeof ${clientRouteName}.params>>;\n\n`;
  } else if (hasAdditionalProps) {
    /* Only body/contentType */
    const props = buildAdditionalProperties(config);
    typeAliases += `type ${paramsTypeName}${genericParams} = {\n  ${props.join(";\n  ")};\n};\n\n`;
  } else {
    /* No params at all */
    typeAliases += `type ${paramsTypeName} = Record<string, never>;\n\n`;
  }

  /* Re-export request/response maps */
  if (config.shouldGenerateRequestMap) {
    typeAliases += `export const ${config.requestMapTypeName} = ${requestMapName};\n`;
    typeAliases += `type ${config.requestMapTypeName} = typeof ${requestMapName};\n`;
  }

  if (config.shouldGenerateResponseMap) {
    typeAliases += `export const ${config.responseMapTypeName} = ${responseMapName};\n`;
    typeAliases += `type ${config.responseMapTypeName} = typeof ${responseMapName};\n\n`;
  }

  /* Generate DeserializerMap type */
  if (config.shouldGenerateResponseMap) {
    typeAliases += `export type ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} = Partial<Record<{
  [Status in keyof ${config.responseMapTypeName}]: keyof ${config.responseMapTypeName}[Status]
}[keyof ${config.responseMapTypeName}], import('./config.js').Deserializer>>;\n\n`;
  } else {
    typeAliases += `export type ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} = import('./config.js').DeserializerMap;\n\n`;
  }

  return typeAliases;
}

export function renderOperationFunction(
  config: OperationFunctionRenderConfig,
): string {
  /* Only add type cast when we have a narrowed type (handled implicitly) */
  /* Overloads: specialize conditional branches by substituting TForceValidation with literals */
  const trueReturn = config.updatedReturnType.replace(
    /TForceValidation extends true/gu,
    "true extends true",
  );
  const falseReturn = config.updatedReturnType.replace(
    /TForceValidation extends true/gu,
    "false extends true",
  );
  /* Overload signatures receive a single named parameter (no destructuring, no defaults) */
  const overloadParamDecl = `params: ${config.parameterInterface}`;

  /* Use narrowed config type if we have a response map type name */
  /* This intersection type helps TypeScript distinguish overload signatures for forceValidation discrimination */
  const configType = config.responseMapTypeName
    ? `GlobalConfig & { deserializers?: ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} }`
    : "GlobalConfig";

  return `${config.typeAliases}${config.summary}export function ${config.functionName}${config.genericParams}(
  ${overloadParamDecl},
  config: ${configType} & { forceValidation: true }
): Promise<${trueReturn}>;
export function ${config.functionName}${config.genericParams}(
  ${overloadParamDecl},
  config: ${configType} & { forceValidation: false }
): Promise<${falseReturn}>;
export function ${config.functionName}${config.genericParams}(
  ${overloadParamDecl},
  config?: ${configType}
): Promise<${config.updatedReturnType}>;
export async function ${config.functionName}${config.genericParams}(
  ${config.parameterDeclaration},
  config: ${configType} = globalConfig
): Promise<${config.updatedReturnType}> {
  ${config.functionBodyCode}
}`;
}

/**
 * Helper: builds body and contentType properties for params type
 */
function buildAdditionalProperties(config: {
  bodyTypeName?: string;
  hasBody: boolean;
  hasRequestMap: boolean;
  hasResponseMap: boolean;
  isBodyOptional: boolean;
  requestMapTypeName: string;
}): string[] {
  const props: string[] = [];

  /* Add body if present */
  if (config.hasBody) {
    const bodyOptional = config.isBodyOptional ? "?" : "";
    let bodyType = config.bodyTypeName || "any";
    if (config.requestMapTypeName) {
      bodyType = `import('zod').infer<${config.requestMapTypeName}[TRequestContentType]>`;
    }
    props.push(`body${bodyOptional}: ${bodyType}`);
  }

  /* Add contentType if needed */
  if (config.hasRequestMap || config.hasResponseMap) {
    const contentTypeParts: string[] = [];
    if (config.hasRequestMap)
      contentTypeParts.push("request?: TRequestContentType");
    if (config.hasResponseMap)
      contentTypeParts.push("response?: TResponseContentType");
    props.push(`contentType?: { ${contentTypeParts.join("; ")} }`);
  }

  return props;
}

/**
 * Helper: builds generic type parameters string
 */
function buildGenericTypeParams(config: {
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
  hasRequestMap: boolean;
  hasResponseMap: boolean;
  requestMapTypeName: string;
}): string {
  const genericParts: string[] = [];

  if (config.hasRequestMap) {
    const defaultReq =
      config.contentTypeMaps.defaultRequestContentType || "application/json";
    genericParts.push(
      `TRequestContentType extends keyof ${config.requestMapTypeName} = "${defaultReq}"`,
    );
  }
  if (config.hasResponseMap) {
    const defaultResp =
      config.contentTypeMaps.defaultResponseContentType || "application/json";
    genericParts.push(`TResponseContentType = "${defaultResp}"`);
  }

  return genericParts.length > 0 ? `<${genericParts.join(", ")}>` : "";
}
