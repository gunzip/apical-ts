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
  responseMapName?: string;
  responseMapType?: string;
  /* Parameter schema generation */
  operationId: string;
  parameterGroups: ReturnType<typeof extractParameterGroups>;
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
      const contentTypesTypeName = config.responseMapTypeName.replace(/Map$/, "ContentTypes");
      genericParts.push(
        `TResponseContentType extends ${contentTypesTypeName} = "${defaultResp}"`,
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
    const parameterSchemas = generateParameterSchemas(config.operationId, config.parameterGroups, {
      strictValidation: false,
    });
    if (parameterSchemas.schemaCode.trim()) {
      /* Add Zod import for parameter schemas */
      config.typeImports.add("z");
      /* Merge parameter schema imports */
      parameterSchemas.typeImports.forEach((imp) => config.typeImports.add(imp));
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
    
    /* Generate flattened content type map for client API compatibility */
    if (responseMapRuntime !== "{}") {
      const flattenedTypeName = config.responseMapTypeName.replace(/Map$/, "ContentTypes");
      typeAliases += `/* Flattened content types for client API compatibility */\nexport type ${flattenedTypeName} = `;
      
      // Extract all unique content types from the response map using regex parsing
      const allContentTypes = new Set<string>();
      
      // Match content type patterns in the response map string
      const contentTypeMatches = responseMapRuntime.match(/"([^"]+)":\s*\{[^}]*"([^"]+)":/g);
      if (contentTypeMatches) {
        contentTypeMatches.forEach(match => {
          // Extract content types from patterns like: "status": { "content-type":
          const ctMatch = match.match(/"([^"]+)":\s*\{[^}]*"([^"]+)":/);
          if (ctMatch && ctMatch[2]) {
            allContentTypes.add(ctMatch[2]);
          }
        });
      }
      
      // Also look for direct content type patterns
      const directMatches = responseMapRuntime.match(/"(application\/[^"]+|text\/[^"]+|[^"]*\/[^"]+)":/g);
      if (directMatches) {
        directMatches.forEach(match => {
          const ct = match.match(/"([^"]+)":/);
          if (ct && ct[1] && ct[1].includes('/')) {
            allContentTypes.add(ct[1]);
          }
        });
      }
      
      if (allContentTypes.size > 0) {
        const contentTypeUnion = Array.from(allContentTypes).map(ct => `"${ct}"`).join(" | ");
        typeAliases += `${contentTypeUnion};\n\n`;
      } else {
        // Fallback to "application/json" if no content types found
        typeAliases += `"application/json";\n\n`;
      }
    }
    
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
