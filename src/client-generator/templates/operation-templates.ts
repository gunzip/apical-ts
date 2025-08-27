import type { extractParameterGroups } from "../parameters.js";
import type { resolveRequestBodyType } from "../request-body.js";
import type {
  generateContentTypeMaps,
  ResponseHandlerResult,
} from "../responses.js";
import type { getOperationSecuritySchemes } from "../security.js";

import { generateParameterSchemas } from "../../shared/parameter-schemas.js";

/* TypeScript rendering functions for operation code generation */

export interface ContentTypeMapsConfig {
  contentTypeMaps: ReturnType<typeof generateContentTypeMaps>;
  requestMapTypeName: string;
  responseMapTypeName: string;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
}

export type GenericParamsConfig = ContentTypeMapsConfig & {
  discriminatedUnionTypeName?: string;
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
  typeImports: Set<string>;
}

export interface ParameterDeclarationConfig {
  destructuredParams: string;
  paramsInterface: string;
}

export type TypeAliasesConfig = ContentTypeMapsConfig & {
  discriminatedUnionTypeDefinition?: string;
  discriminatedUnionTypeName?: string;
  /* Parameter schema generation */
  operationId: string | undefined;
  parameterGroups: ReturnType<typeof extractParameterGroups>;
  responseMapName?: string;
  responseMapType?: string;
  /* Type imports to merge parameter schema imports */
  typeImports: Set<string>;
};

/*
 * Creates generic parameter list for request/response content-type selection.
 * Example output: <TRequestContentType extends keyof MyOpRequestMap = "application/json", TResponseContentType extends keyof MyOpResponseMap = "application/json">
 * Returns both the generic parameter string and the adjusted return type (map lookup when response map present).
 */
export function buildGenericParams(
  config: GenericParamsConfig,
): GenericParamsResult {
  let genericParams = "";
  const updatedReturnType = config.initialReturnType;

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
      /* Collect all nested content-type keys from the response map. Using keyof on the union of value objects produces never; mapped type flattens them. */
      genericParts.push(
        `TResponseContentType extends { [K in keyof ${config.responseMapTypeName}]: keyof ${config.responseMapTypeName}[K]; }[keyof ${config.responseMapTypeName}] = "${defaultResp}"`,
      );
    }
    if (genericParts.length > 0) {
      genericParams = `<${genericParts.join(", ")}>`;
    }
  }
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

/*
 * Emits exported request/response content-type map aliases and parameter schemas.
 * Skips each side when no map required (empty object or no body for request).
 */
export function buildTypeAliases(config: TypeAliasesConfig): string {
  let typeAliases = "";

  /* Generate parameter schemas for client operations (for type-safe input parameters) */
  if (config.operationId) {
    const parameterSchemas = generateParameterSchemas(
      config.operationId,
      config.parameterGroups,
      {
        strictValidation: false,
      },
    );
    if (parameterSchemas.schemaCode.trim()) {
      /* Add Zod import for parameter schemas */
      config.typeImports.add("z");
      /* Merge parameter schema imports */
      parameterSchemas.typeImports.forEach((imp) =>
        config.typeImports.add(imp),
      );
      typeAliases += `/* Parameter schemas for type-safe inputs */\n${parameterSchemas.schemaCode}\n\n`;
    }
  }

  /* Add discriminated union response type if available */
  if (config.discriminatedUnionTypeDefinition) {
    typeAliases += `${config.discriminatedUnionTypeDefinition}\n\n`;
  }

  /* Don't add discriminated union response map if we're already generating the normal response map to avoid duplicates */

  if (config.shouldGenerateRequestMap) {
    typeAliases += `export type ${config.requestMapTypeName} = ${config.contentTypeMaps.requestMapType};\n\n`;
  }
  /* Always emit response map type alias for stability; if empty map that's fine */
  if (
    config.shouldGenerateResponseMap ||
    config.contentTypeMaps.responseMapType
  ) {
    const responseMapRuntime = config.contentTypeMaps.responseMapType || "{}";
    // Emit runtime object (only if non-empty) + type alias
    if (responseMapRuntime !== "{}") {
      typeAliases += `export const ${config.responseMapTypeName} = ${responseMapRuntime} as const;\n`;
    }
    typeAliases += `export type ${config.responseMapTypeName} = ${responseMapRuntime};\n\n`;

    /* Emit a narrowed DeserializerMap type for this operation.
     * If we have a non-empty response map constant we can use its keys directly via keyof typeof <Map>.
     * Otherwise fall back to a generic string index (keeps backwards compatibility).
     */
    const perOpDeserializerMap =
      responseMapRuntime !== "{}"
        ? `export type ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} = Partial<Record<keyof typeof ${config.responseMapTypeName}, import('./config.js').Deserializer>>;\n\n`
        : `export type ${config.responseMapTypeName.replace(/Map$/u, "DeserializerMap")} = import('./config.js').DeserializerMap;\n\n`;
    typeAliases += perOpDeserializerMap;
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
