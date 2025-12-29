import type { ImportManager } from "../../core-generator/import-types.js";
import type { extractParameterGroups } from "../parameters.js";
import type { resolveRequestBodyType } from "../request-body.js";
import type {
  generateContentTypeMaps,
  ResponseHandlerResult,
} from "../responses.js";
import type { getOperationSecuritySchemes } from "../security.js";

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
/* eslint-disable complexity */
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
  operationId: string;
  requestMapTypeName: string;
  responseMapTypeName: string;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
}): string {
  const sanitizedId = sanitizeIdentifier(config.operationId);

  /* Convert PascalCase type names to camelCase for route exports */
  const requestMapName = sanitizedId + "RequestMap";
  const responseMapName = sanitizedId + "ResponseMap";

  /* Import route metadata (requestMap, responseMap, clientRoute for params) */
  config.importManager.addRouteImport(
    sanitizedId,
    requestMapName,
    responseMapName,
  );

  /* Import clientRoute to access params via typeof */
  config.importManager.addClientRouteImport(sanitizedId);

  const hasAnyParams =
    config.hasPathParams || config.hasQueryParams || config.hasHeaderParams;

  /* Create type aliases that map PascalCase names to camelCase imports */
  let typeAliases = "";

  /* Create params type alias */
  const paramsTypeName = `${config.operationId.charAt(0).toUpperCase() + config.operationId.slice(1)}Params`;

  /* Build params type based on what's present */
  const paramsParts: string[] = [];

  /* Extract params type from clientRoute using typeof */
  const clientRouteName = `${sanitizedId}ClientRoute`;
  if (hasAnyParams) {
    /* Build type parts - headers optional based on spec requirements and security config */
    /* Use Extract to safely access shape properties that may or may not exist */
    const queryPart = config.hasQueryParams
      ? `query?: z.infer<Extract<NonNullable<typeof ${clientRouteName}.params>['shape']['query'], import('zod').ZodTypeAny>>`
      : "";
    const pathPart = config.hasPathParams
      ? `path: z.infer<Extract<NonNullable<typeof ${clientRouteName}.params>['shape']['path'], import('zod').ZodTypeAny>>`
      : "";
    const headersPart = config.hasHeaderParams
      ? `headers${config.isHeadersOptional ? "?" : ""}: z.infer<Extract<NonNullable<typeof ${clientRouteName}.params>['shape']['headers'], import('zod').ZodTypeAny>>`
      : "";
    const parts = [queryPart, pathPart, headersPart].filter(Boolean);
    if (parts.length > 0) {
      paramsParts.push(`{ ${parts.join("; ")} }`);
    }
  }

  /* Add body if present */
  if (config.hasBody) {
    const bodyOptional = config.isBodyOptional ? "?" : "";
    let bodyType = config.bodyTypeName || "any";
    if (config.requestMapTypeName) {
      /* Use z.infer to get the actual data type from the Zod schema */
      bodyType = `import('zod').infer<${config.requestMapTypeName}[TRequestContentType]>`;
    }
    paramsParts.push(`  body${bodyOptional}: ${bodyType}`);
  }

  /* Add contentType if needed */
  if (config.hasRequestMap || config.hasResponseMap) {
    const contentTypeParts: string[] = [];
    if (config.hasRequestMap)
      contentTypeParts.push("request?: TRequestContentType");
    if (config.hasResponseMap)
      contentTypeParts.push("response?: TResponseContentType");
    paramsParts.push(`  contentType?: { ${contentTypeParts.join("; ")} }`);
  }

  /* Generate params type - use empty object if no params */
  /* Add generic parameters only for the ones we actually use, with proper constraints and defaults */
  let genericParams = "";
  if (config.hasRequestMap || config.hasResponseMap) {
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
    genericParams = `<${genericParts.join(", ")}>`;
  }

  if (paramsParts.length > 0) {
    /* Use intersection if we have ParsedParamsType and additional properties */
    if (
      hasAnyParams &&
      (config.hasBody || config.hasRequestMap || config.hasResponseMap)
    ) {
      const baseType = paramsParts[0]; // This might be ParsedParamsType or a Required<> variant
      const additionalProps = paramsParts.slice(1); // Skip base type
      typeAliases += `type ${paramsTypeName}${genericParams} = ${baseType} & {\n${additionalProps.join(";\n")};\n};\n\n`;
    } else if (hasAnyParams) {
      /* Just use ParsedParamsType directly (or Required<> variant) */
      typeAliases += `type ${paramsTypeName} = ${paramsParts[0]};\n\n`;
    } else {
      /* Only body/contentType, no params */
      typeAliases += `type ${paramsTypeName}${genericParams} = {\n${paramsParts.join(";\n")};\n};\n\n`;
    }
  } else {
    typeAliases += `type ${paramsTypeName} = Record<string, never>;\n\n`;
  }

  /* Re-export the runtime values with PascalCase names for backward compatibility */
  if (config.shouldGenerateRequestMap) {
    typeAliases += `export const ${config.requestMapTypeName} = ${requestMapName};\n`;
    typeAliases += `type ${config.requestMapTypeName} = typeof ${requestMapName};\n`;
  }

  if (config.shouldGenerateResponseMap) {
    typeAliases += `export const ${config.responseMapTypeName} = ${responseMapName};\n`;
    typeAliases += `type ${config.responseMapTypeName} = typeof ${responseMapName};\n\n`;
  }

  /* Generate the DeserializerMap type based on the imported ResponseMap */
  if (config.shouldGenerateResponseMap) {
    const perOpDeserializerMap = `export type ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} = Partial<Record<{
  [Status in keyof ${config.responseMapTypeName}]: keyof ${config.responseMapTypeName}[Status]
}[keyof ${config.responseMapTypeName}], import('./config.js').Deserializer>>;\n\n`;
    typeAliases += perOpDeserializerMap;
  } else {
    typeAliases += `export type ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} = import('./config.js').DeserializerMap;\n\n`;
  }

  return typeAliases;
}

export function renderOperationFunction(
  config: OperationFunctionRenderConfig,
): string {
  /* Use narrowed config type if we have a response map type name */
  const baseConfigType = config.responseMapTypeName
    ? `GlobalConfig & { deserializers?: ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} }`
    : "GlobalConfig";

  /* forceValidation typing now handled exclusively by configureOperations overload discrimination */
  const configType = baseConfigType;

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
