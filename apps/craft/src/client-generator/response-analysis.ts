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

/*
 * Analyzes the complete response structure for an operation
 */
export function analyzeResponseStructure(
  config: ResponseAnalysisConfig,
): ResponseAnalysis {
  const { hasResponseContentTypeMap = false, operation, typeImports } = config;

  /* Process response codes and default response */
  const responses = processResponseCodes(
    operation,
    typeImports,
    hasResponseContentTypeMap,
  );

  const defaultResponse = processDefaultResponse(
    operation,
    typeImports,
    hasResponseContentTypeMap,
  );

  if (defaultResponse) {
    responses.push(defaultResponse);
  }

  /* Generate discriminated union types if operation has an operationId */
  let discriminatedUnionResult;
  if (operation.operationId) {
    discriminatedUnionResult = generateDiscriminatedUnionTypes(
      operation,
      operation.operationId,
      typeImports,
    );
  }

  /* Generate union types based on available response map */
  let unionTypes: string[];
  if (discriminatedUnionResult?.responseMapName) {
    unionTypes = generateUnionTypesWithResponseMap(
      responses,
      discriminatedUnionResult.responseMapName,
    );
  } else {
    unionTypes = generateFallbackUnionTypes(responses);
  }

  /* Always add ApiResponseError to the union for error handling */
  unionTypes.push("ApiResponseError");

  return {
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
  const statusSuffix = statusCode === "default" ? "Default" : statusCode;
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${statusSuffix}Response`;
  typeImports.add(typeName);
  return typeName;
}

/*
 * Generates fallback union types without response map
 */
function generateFallbackUnionTypes(responses: ResponseInfo[]): string[] {
  return responses.map((responseInfo) => {
    const statusCodeKey =
      responseInfo.statusCode === "default"
        ? `"${responseInfo.statusCode}"`
        : responseInfo.statusCode;
    /* Use number type for default responses since they represent any unspecified status code */
    const statusCodeType =
      responseInfo.statusCode === "default" ? "number" : statusCodeKey;

    if (responseInfo.hasSchema) {
      return `ApiResponse<${statusCodeType}, unknown>`;
    } else {
      const dataType = responseInfo.contentType ? "unknown" : "void";
      return `ApiResponse<${statusCodeType}, ${dataType}>`;
    }
  });
}

/*
 * Generates union types using response map
 */
function generateUnionTypesWithResponseMap(
  responses: ResponseInfo[],
  responseMapName: string,
): string[] {
  return responses.map((responseInfo) => {
    const statusCodeKey =
      responseInfo.statusCode === "default"
        ? `"${responseInfo.statusCode}"`
        : responseInfo.statusCode;
    /* Use number type for default responses since they represent any unspecified status code */
    const statusCodeType =
      responseInfo.statusCode === "default" ? "number" : statusCodeKey;

    if (responseInfo.hasSchema) {
      return `(TForceValidation extends true ? ApiResponseWithForcedParse<${statusCodeType}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCodeType}, typeof ${responseMapName}>)`;
    } else {
      const dataType = responseInfo.contentType ? "unknown" : "void";
      return `ApiResponse<${statusCodeType}, ${dataType}>`;
    }
  });
}

/*
 * Processes default response if present
 */
function processDefaultResponse(
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap: boolean,
): null | ResponseInfo {
  if (!operation.responses?.default) {
    return null;
  }

  const defaultResponse = operation.responses.default as ResponseObject;
  return buildResponseTypeInfo(
    "default",
    defaultResponse,
    operation,
    typeImports,
    hasResponseContentTypeMap,
  );
}

/*
 * Processes regular response codes (excludes default)
 */
function processResponseCodes(
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap: boolean,
): ResponseInfo[] {
  if (!operation.responses) {
    return [];
  }

  const responses = operation.responses;
  const responseCodes = Object.keys(responses).filter(
    (code) => code !== "default",
  );
  responseCodes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  return responseCodes.map((code) => {
    const response = responses[code] as ResponseObject;
    return buildResponseTypeInfo(
      code,
      response,
      operation,
      typeImports,
      hasResponseContentTypeMap,
    );
  });
}
