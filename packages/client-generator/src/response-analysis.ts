/* Pure analysis functions for response processing */

import type {
  OpenAPIObject,
  OperationObject,
  ResponseObject,
} from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import { resolveResponse } from "@apical-ts/core-utils/shared";
import { resolveSchemaTypeName } from "@apical-ts/core-utils/shared";

import type {
  ContentTypeAnalysis,
  ParsingStrategy,
  ResponseAnalysis,
  ResponseAnalysisConfig,
  ResponseInfo,
} from "./models/response-models.js";

import { getResponseContentType } from "./utils.js";

// Interfaces (alphabetical keys inside)
interface BuildUnionTypesParams {
  defaultResponseInfo?: ResponseInfo;
  responseHeadersMapName?: string;
  responseMapName?: string;
  responses: ResponseInfo[];
}

/*
 * Analyzes the content type structure of a response
 */
export function analyzeContentTypes(
  response: ResponseObject,
): ContentTypeAnalysis {
  const allContentTypes = Object.keys(response.content || {});

  const hasJsonLike = allContentTypes.some(
    (ct) => ct.includes("json") || ct.includes("+json"),
  );

  const hasNonJson = allContentTypes.some(
    (ct) => !ct.includes("json") && !ct.includes("+json"),
  );

  return {
    allContentTypes,
    hasJsonLike,
    hasMixedContentTypes: hasJsonLike && hasNonJson,
    hasNonJson,
  };
}

// Main analysis entry
export function analyzeResponseStructure(
  config: ResponseAnalysisConfig,
): ResponseAnalysis {
  const {
    doc,
    hasResponseContentTypeMap = false,
    operation,
    responseHeadersMapName,
    responseMapName,
    typeImports,
  } = config;

  const { defaultResponseInfo, responses } = collectResponses(
    operation,
    typeImports,
    hasResponseContentTypeMap,
    doc,
  );

  // Derive response map name for union types
  const effectiveResponseMapName =
    responseMapName ||
    (operation.operationId
      ? `${sanitizeIdentifier(operation.operationId).charAt(0).toUpperCase()}${sanitizeIdentifier(operation.operationId).slice(1)}ResponseMap`
      : undefined);

  const unionTypes = buildUnionTypes({
    defaultResponseInfo,
    responseHeadersMapName,
    responseMapName: effectiveResponseMapName,
    responses,
  });

  return {
    defaultResponseInfo,
    defaultReturnType: "ApiResponse<number, unknown>",
    responseHeadersMapName,
    responseMapName: effectiveResponseMapName,
    responses,
    unionTypes,
  };
}

/* ---------------- Internal helpers (extracted to reduce complexity) ---------------- */

/*
 * Builds response type information for a single response
 */
export function buildResponseTypeInfo(
  statusCode: string,
  response: ResponseObject,
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap: boolean,
): ResponseInfo {
  const contentType = getResponseContentType(response);
  const contentTypeAnalysis = analyzeContentTypes(response);

  let typeName: null | string = null;
  let hasSchema = false;

  if (contentType && response.content?.[contentType]?.schema) {
    hasSchema = true;
    const suffix =
      statusCode === "default" ? "DefaultResponse" : `${statusCode}Response`;
    typeName = resolveSchemaTypeName(
      response.content[contentType].schema,
      operation.operationId || "unknown",
      suffix,
      typeImports,
      "response",
    );
  }

  const parsingStrategy = determineParsingStrategy(
    contentType || "",
    hasSchema,
    contentTypeAnalysis,
    hasResponseContentTypeMap,
  );

  return {
    contentType,
    hasSchema,
    parsingStrategy,
    statusCode,
    typeName,
  };
}

/*
 * Determines the parsing strategy for a response based on its content type and schema
 */
export function determineParsingStrategy(
  contentType: string,
  hasSchema: boolean,
  contentTypeAnalysis: ContentTypeAnalysis,
  hasResponseContentTypeMap: boolean,
): ParsingStrategy {
  const isJsonLike =
    contentType.includes("json") || contentType.includes("+json");
  const useValidation = hasSchema && isJsonLike;
  const requiresRuntimeContentTypeCheck =
    contentTypeAnalysis.hasMixedContentTypes && hasResponseContentTypeMap;

  return {
    isJsonLike,
    requiresRuntimeContentTypeCheck,
    useValidation,
  };
}

// Helpers (ordered alphabetically by name)
function buildUnionTypes({
  defaultResponseInfo,
  responseHeadersMapName,
  responseMapName,
  responses,
}: BuildUnionTypesParams): string[] {
  const unionTypes: string[] = [];
  const mapName = responseMapName;
  const renderHeadersType = (statusCode: string) =>
    responseHeadersMapName
      ? `, ResponseHeadersForStatus<typeof ${responseHeadersMapName}, ${statusCode}>`
      : "";
  const pushStandard = (info: ResponseInfo) => {
    const dataType = info.contentType ? "unknown" : "void";
    const statusLiteral =
      info.statusCode === "default" ? '"default"' : `"${info.statusCode}"`;
    unionTypes.push(
      `ApiResponse<${statusLiteral}, ${dataType}${renderHeadersType(statusLiteral)}>`,
    );
  };
  if (mapName) {
    for (const info of responses) {
      if (info.hasSchema) {
        const statusLiteral =
          info.statusCode === "default" ? '"default"' : `"${info.statusCode}"`;
        unionTypes.push(
          `(TForceValidation extends true ? ApiResponseWithForcedParse<${statusLiteral}, typeof ${mapName}${responseHeadersMapName ? `, typeof ${responseHeadersMapName}` : ""}> : ApiResponseWithParse<${statusLiteral}, typeof ${mapName}${responseHeadersMapName ? `, typeof ${responseHeadersMapName}` : ""}>)`,
        );
      } else {
        pushStandard(info);
      }
    }
    if (defaultResponseInfo) {
      if (defaultResponseInfo.hasSchema) {
        unionTypes.push(
          `(TForceValidation extends true ? ApiResponseWithForcedParse<"default", typeof ${mapName}${responseHeadersMapName ? `, typeof ${responseHeadersMapName}` : ""}> : ApiResponseWithParse<"default", typeof ${mapName}${responseHeadersMapName ? `, typeof ${responseHeadersMapName}` : ""}>)`,
        );
      } else {
        pushStandard(defaultResponseInfo);
      }
    }
  } else {
    for (const info of responses) {
      if (info.hasSchema) {
        const statusLiteral =
          info.statusCode === "default" ? '"default"' : `"${info.statusCode}"`;
        unionTypes.push(
          `ApiResponse<${statusLiteral}, unknown${renderHeadersType(statusLiteral)}>`,
        );
      } else {
        pushStandard(info);
      }
    }
    if (defaultResponseInfo) {
      if (defaultResponseInfo.hasSchema) {
        unionTypes.push(
          `ApiResponse<"default", unknown${renderHeadersType('"default"')}>`,
        );
      } else {
        pushStandard(defaultResponseInfo);
      }
    }
  }
  unionTypes.push("ApiResponseError");
  return unionTypes;
}

function collectResponses(
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap: boolean,
  doc?: OpenAPIObject,
) {
  const responses: ResponseInfo[] = [];
  let defaultResponseInfo: ResponseInfo | undefined;

  if (!operation.responses) {
    return { defaultResponseInfo, responses };
  }

  const responseCodes = Object.keys(operation.responses).filter(
    (code) => code !== "default",
  );

  // Sort response codes: specific codes first (numerically), then wildcards
  responseCodes.sort((a, b) => {
    const isAWildcard = /^\dXX$/iu.test(a);
    const isBWildcard = /^\dXX$/iu.test(b);

    // If both are wildcards or both are specific, sort them normally
    if (isAWildcard === isBWildcard) {
      return parseInt(a, 10) - parseInt(b, 10);
    }

    // Wildcards should come after specific codes
    return isAWildcard ? 1 : -1;
  });

  for (const code of responseCodes) {
    const responseOrRef = operation.responses[code];
    const responseObj = resolveResponse(responseOrRef, doc);
    if (!responseObj) continue;

    responses.push(
      buildResponseTypeInfo(
        code,
        responseObj,
        operation,
        typeImports,
        hasResponseContentTypeMap,
      ),
    );
  }

  if (operation.responses.default) {
    const responseOrRef = operation.responses.default;
    const responseObj = resolveResponse(responseOrRef, doc);
    if (responseObj) {
      defaultResponseInfo = buildResponseTypeInfo(
        "default",
        responseObj,
        operation,
        typeImports,
        hasResponseContentTypeMap,
      );
    }
  }

  return { defaultResponseInfo, responses };
}
