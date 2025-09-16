/* Pure analysis functions for response processing */

import type {
  OpenAPIObject,
  OperationObject,
  ResponseObject,
} from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import type {
  ContentTypeAnalysis,
  ParsingStrategy,
  ResponseAnalysis,
  ResponseAnalysisConfig,
  ResponseInfo,
} from "./models/response-models.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { extractResponseContentTypes } from "./operation-extractor.js";
import { getResponseContentType } from "./utils.js";

// Interfaces (alphabetical keys inside)
interface BuildUnionTypesParams {
  defaultResponseInfo?: ResponseInfo;
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
    hasResponseContentTypeMap = false,
    openApiDoc,
    operation,
    responseMapName,
    typeImports,
  } = config;

  const { defaultResponseInfo, responses } = collectResponses(
    operation,
    typeImports,
    hasResponseContentTypeMap,
    openApiDoc,
  );

  // Derive response map name for union types
  const effectiveResponseMapName =
    responseMapName ||
    (operation.operationId
      ? `${sanitizeIdentifier(operation.operationId).charAt(0).toUpperCase()}${sanitizeIdentifier(operation.operationId).slice(1)}ResponseMap`
      : undefined);

  const unionTypes = buildUnionTypes({
    defaultResponseInfo,
    responseMapName: effectiveResponseMapName,
    responses,
  });

  return {
    defaultResponseInfo,
    defaultReturnType: "ApiResponse<number, unknown>",
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
    typeName = resolveResponseTypeName(
      response.content[contentType].schema,
      operation,
      statusCode,
      typeImports,
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

/*
 * Resolves a schema to a TypeScript type name and updates type imports
 */
export function resolveResponseTypeName(
  schema: unknown,
  operation: OperationObject,
  statusCode: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const ref = schema.$ref;
    assert(
      ref.startsWith("#/components/schemas/"),
      `Unsupported schema reference: ${ref}`,
    );
    const originalSchemaName = ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in response schema");
    const typeName = sanitizeIdentifier(originalSchemaName as string);
    typeImports.add(typeName);
    return typeName;
  }

  /* Inline schema: synthesize a type name based on operationId and status code */
  assert(operation.operationId, "Invalid operationId");
  const sanitizedOperationId = sanitizeIdentifier(operation.operationId);
  const suffix =
    statusCode === "default" ? "DefaultResponse" : `${statusCode}Response`;
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
  typeImports.add(typeName);
  return typeName;
}

// Helpers (ordered alphabetically by name)
function buildUnionTypes({
  defaultResponseInfo,
  responseMapName,
  responses,
}: BuildUnionTypesParams): string[] {
  const unionTypes: string[] = [];
  const mapName = responseMapName;
  const pushStandard = (info: ResponseInfo) => {
    const dataType = info.contentType ? "unknown" : "void";
    const statusLiteral =
      info.statusCode === "default" ? '"default"' : info.statusCode;
    unionTypes.push(`ApiResponse<${statusLiteral}, ${dataType}>`);
  };
  if (mapName) {
    for (const info of responses) {
      if (info.hasSchema) {
        unionTypes.push(
          `(TForceValidation extends true ? ApiResponseWithForcedParse<${info.statusCode}, typeof ${mapName}> : ApiResponseWithParse<${info.statusCode}, typeof ${mapName}>)`,
        );
      } else {
        pushStandard(info);
      }
    }
    if (defaultResponseInfo) {
      if (defaultResponseInfo.hasSchema) {
        unionTypes.push(
          `(TForceValidation extends true ? ApiResponseWithForcedParse<"default", typeof ${mapName}> : ApiResponseWithParse<"default", typeof ${mapName}>)`,
        );
      } else {
        pushStandard(defaultResponseInfo);
      }
    }
  } else {
    for (const info of responses) {
      if (info.hasSchema) {
        unionTypes.push(`ApiResponse<${info.statusCode}, unknown>`);
      } else {
        pushStandard(info);
      }
    }
    if (defaultResponseInfo) {
      if (defaultResponseInfo.hasSchema) {
        unionTypes.push(`ApiResponse<"default", unknown>`);
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
  openApiDoc?: OpenAPIObject,
) {
  const responses: ResponseInfo[] = [];
  let defaultResponseInfo: ResponseInfo | undefined;

  if (!operation.responses) {
    return { defaultResponseInfo, responses };
  }

  // Use extractResponseContentTypes to get resolved response content types
  const responseContentTypes = extractResponseContentTypes(
    operation,
    openApiDoc,
  );

  // Convert the extracted content types to ResponseInfo objects
  for (const responseGroup of responseContentTypes) {
    const statusCode = responseGroup.statusCode;
    const contentTypes = responseGroup.contentTypes;

    if (contentTypes.length > 0) {
      // For now, take the first content type (usually application/json)
      const firstContentType = contentTypes[0];
      const contentType = firstContentType.contentType;
      const schema = firstContentType.schema;

      let typeName: null | string = null;
      let hasSchema = false;

      if (schema) {
        hasSchema = true;
        typeName = resolveResponseTypeName(
          schema,
          operation,
          statusCode,
          typeImports,
        );
      }

      const contentTypeAnalysis: ContentTypeAnalysis = {
        allContentTypes: contentTypes.map((ct) => ct.contentType),
        hasJsonLike: contentTypes.some((ct) => ct.contentType.includes("json")),
        hasMixedContentTypes: false, // Will be set below
        hasNonJson: contentTypes.some((ct) => !ct.contentType.includes("json")),
      };
      contentTypeAnalysis.hasMixedContentTypes =
        contentTypeAnalysis.hasJsonLike && contentTypeAnalysis.hasNonJson;

      const parsingStrategy = determineParsingStrategy(
        contentType,
        hasSchema,
        contentTypeAnalysis,
        hasResponseContentTypeMap,
      );

      const responseInfo: ResponseInfo = {
        contentType,
        hasSchema,
        parsingStrategy,
        statusCode,
        typeName,
      };

      responses.push(responseInfo);
    }
  }

  // Handle default response if present (not handled by extractResponseContentTypes)
  if (operation.responses.default) {
    const response = operation.responses.default as ResponseObject;
    defaultResponseInfo = buildResponseTypeInfo(
      "default",
      response,
      operation,
      typeImports,
      hasResponseContentTypeMap,
    );
  }

  return { defaultResponseInfo, responses };
}
