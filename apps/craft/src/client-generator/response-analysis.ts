/* Pure analysis functions for response processing */

import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

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
import { generateDiscriminatedUnionTypes } from "./discriminated-union-generator.js";
import { getResponseContentType } from "./utils.js";

interface BuildUnionTypesParams {
  defaultResponseInfo?: ResponseInfo;
  discriminatedUnionResult?: ReturnType<typeof generateDiscriminatedUnionTypes>;
  responses: ResponseInfo[];
}

/*
 * Analyzes the complete response structure for an operation
// Exported helper needed by server/client generators should appear before local helpers
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

 */
// Interfaces (alphabetical keys inside)
interface BuildUnionTypesParams {
  defaultResponseInfo?: ResponseInfo;
  discriminatedUnionResult?: ReturnType<typeof generateDiscriminatedUnionTypes>;
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
  const { hasResponseContentTypeMap = false, operation, typeImports } = config;

  const { defaultResponseInfo, responses } = collectResponses(
    operation,
    typeImports,
    hasResponseContentTypeMap,
  );

  const discriminatedUnionResult = operation.operationId
    ? generateDiscriminatedUnionTypes(
        operation,
        operation.operationId,
        typeImports,
      )
    : undefined;

  const unionTypes = buildUnionTypes({
    defaultResponseInfo,
    discriminatedUnionResult,
    responses,
  });

  return {
    defaultResponseInfo,
    defaultReturnType: "ApiResponse<number, unknown>",
    discriminatedUnionTypeDefinition:
      discriminatedUnionResult?.unionTypeDefinition,
    discriminatedUnionTypeName: discriminatedUnionResult?.unionTypeName,
    responseMapName: discriminatedUnionResult?.responseMapName,
    responseMapType: discriminatedUnionResult?.responseMapType,
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
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${statusCode}Response`;
  typeImports.add(typeName);
  return typeName;
}

// Helpers (ordered alphabetically by name)
function buildUnionTypes({
  defaultResponseInfo,
  discriminatedUnionResult,
  responses,
}: BuildUnionTypesParams): string[] {
  const unionTypes: string[] = [];
  const mapName = discriminatedUnionResult?.responseMapName;
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
) {
  const responses: ResponseInfo[] = [];
  let defaultResponseInfo: ResponseInfo | undefined;

  if (!operation.responses) {
    return { defaultResponseInfo, responses };
  }

  const responseCodes = Object.keys(operation.responses).filter(
    (code) => code !== "default",
  );
  responseCodes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  for (const code of responseCodes) {
    const response = operation.responses[code] as ResponseObject;
    responses.push(
      buildResponseTypeInfo(
        code,
        response,
        operation,
        typeImports,
        hasResponseContentTypeMap,
      ),
    );
  }

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
