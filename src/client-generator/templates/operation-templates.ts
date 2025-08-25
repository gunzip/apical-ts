import type { extractParameterGroups } from "../parameters.js";
import type { resolveRequestBodyType } from "../request-body.js";
import type { generateContentTypeMaps } from "../responses.js";
import type { getOperationSecuritySchemes } from "../security.js";

/* TypeScript rendering functions for operation code generation */

export type GenericParamsConfig = {
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
  initialReturnType: string;
  requestMapTypeName: string;
  responseMapTypeName: string;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
};

export type GenericParamsResult = {
  genericParams: string;
  updatedReturnType: string;
};

/**
 * Renders the complete TypeScript function code from structured metadata
 */
export type OperationFunctionRenderConfig = {
  functionBodyCode: string;
  functionName: string;
  genericParams: string;
  parameterDeclaration: string;
  summary: string;
  typeAliases: string;
  updatedReturnType: string;
};

/* Data structure representing operation metadata extracted from OpenAPI specification */
export type OperationMetadata = {
  authHeaders: string[];
  bodyInfo: {
    bodyTypeInfo: ReturnType<typeof resolveRequestBodyType> | undefined;
    contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
    requestContentType: string | undefined;
    requestContentTypes: string[];
    requestMapTypeName: string;
    responseMapTypeName: string;
    shouldGenerateRequestMap: boolean;
    shouldGenerateResponseMap: boolean;
  };
  functionBodyCode: string;
  functionName: string;
  hasBody: boolean;
  operationName: string;
  operationSecurityHeaders: ReturnType<typeof getOperationSecuritySchemes>;
  overridesSecurity: boolean;
  parameterGroups: ReturnType<typeof extractParameterGroups>;
  parameterStructures: {
    destructuredParams: string;
    paramsInterface: string;
  };
  responseHandlers: {
    responseHandlers: string[];
    returnType: string;
  };
  summary: string;
  typeImports: Set<string>;
};

export type ParameterDeclarationConfig = {
  destructuredParams: string;
  paramsInterface: string;
};

export type TypeAliasesConfig = {
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
  requestMapTypeName: string;
  responseMapTypeName: string;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
};

/**
 * Creates generic parameter list for request/response content-type selection.
 * Example output: <TRequestContentType extends keyof MyOpRequestMap = "application/json", TResponseContentType extends keyof MyOpResponseMap = "application/json">
 * Returns both the generic parameter string and the adjusted return type (map lookup when response map present).
 */
export function buildGenericParams(
  config: GenericParamsConfig,
): GenericParamsResult {
  let genericParams = "";
  let updatedReturnType = config.initialReturnType;

  if (config.shouldGenerateRequestMap || config.shouldGenerateResponseMap) {
    const genericParts: string[] = [];
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
      genericParts.push(
        `TResponseContentType extends keyof ${config.responseMapTypeName} = "${defaultResp}"`,
      );
    }
    if (genericParts.length > 0) {
      genericParams = `<${genericParts.join(", ")}>`;
      if (config.shouldGenerateResponseMap) {
        updatedReturnType = `${config.responseMapTypeName}[TResponseContentType]`;
      }
    }
  }
  return { genericParams, updatedReturnType };
}

/**
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
 * Emits exported request/response content-type map aliases.
 * Skips each side when no map required (empty object or no body for request).
 */
export function buildTypeAliases(config: TypeAliasesConfig): string {
  let typeAliases = "";
  if (config.shouldGenerateRequestMap) {
    typeAliases += `export type ${config.requestMapTypeName} = ${config.contentTypeMaps.requestMapType};\n\n`;
  }
  /* Always emit response map type alias for stability; if empty map that's fine */
  if (
    config.shouldGenerateResponseMap ||
    config.contentTypeMaps.responseMapType
  ) {
    typeAliases += `export type ${config.responseMapTypeName} = ${config.contentTypeMaps.responseMapType || "{}"};\n\n`;
  }
  return typeAliases;
}

export function renderOperationFunction(
  config: OperationFunctionRenderConfig,
): string {
  return `${config.typeAliases}${config.summary}export async function ${config.functionName}${config.genericParams}(
  ${config.parameterDeclaration},
  config: GlobalConfig = globalConfig
): Promise<${config.updatedReturnType}> {
  ${config.functionBodyCode}
}`;
}
