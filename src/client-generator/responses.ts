import type { OperationObject, RequestBodyObject } from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateResponseMap } from "../shared/response-maps.js";
import { generateRequestBodyMap } from "../shared/request-body-maps.js";
import {
  type ContentTypeMapping,
  extractRequestContentTypes,
  extractResponseContentTypes,
} from "./operation-extractor.js";
import { analyzeResponseStructure } from "./response-analysis.js";
import {
  renderResponseHandlers,
  renderUnionType,
} from "./templates/response-templates.js";

/**
 * Result of generating content type maps
 */
export interface ContentTypeMaps {
  defaultRequestContentType: null | string;
  defaultResponseContentType: null | string;
  requestContentTypeCount: number;
  requestMapType: string;
  responseContentTypeCount: number;
  responseMapType: string;
  typeImports: Set<string>;
}

/**
 * Result of response handler generation
 */
export interface ResponseHandlerResult {
  discriminatedUnionTypeDefinition?: string;
  discriminatedUnionTypeName?: string;
  responseHandlers: string[];
  responseMapName?: string;
  responseMapType?: string;
  returnType: string;
}

/**
 * Information about response types and handlers
 */
export interface ResponseTypeInfo {
  responseHandlers: string[];
  typeImports: Set<string>;
  typeName: null | string;
}

/*
 * Generates TypeScript type maps for request and response content types.
 */
export function generateContentTypeMaps(
  operation: OperationObject,
): ContentTypeMaps {
  assert(operation.operationId, "Operation ID is required");
  const typeImports = new Set<string>();
  const operationId = operation.operationId as string; // asserted

  const request = buildRequestContentTypeMap(
    operation,
    operationId,
    typeImports,
  );
  const response = buildResponseContentTypeMap(
    operation,
    operationId,
    typeImports,
  );

  return {
    defaultRequestContentType: request.defaultRequestContentType,
    defaultResponseContentType: response.defaultResponseContentType,
    requestContentTypeCount: request.requestContentTypeCount,
    requestMapType: request.requestMapType,
    responseContentTypeCount: response.responseContentTypeCount,
    responseMapType: response.responseMapType,
    typeImports,
  };
}

/*
 * Generates response handling code and determines return type using discriminated unions.
 * Produces an array of switch-case handler segments and a union type of ApiResponse.
 */
export function generateResponseHandlers(
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap = false,
  responseMapName?: string,
): ResponseHandlerResult {
  /* Analyze the response structure */
  const analysis = analyzeResponseStructure({
    hasResponseContentTypeMap,
    operation,
    typeImports,
  });

  /* Generate response handlers using templates */
  const responseHandlers = renderResponseHandlers(
    analysis.responses,
    responseMapName,
  );

  /* Generate return type using templates */
  const returnType = renderUnionType(
    analysis.unionTypes,
    analysis.defaultReturnType,
  );

  return {
    discriminatedUnionTypeDefinition: analysis.discriminatedUnionTypeDefinition,
    discriminatedUnionTypeName: analysis.discriminatedUnionTypeName,
    responseHandlers,
    responseMapName: analysis.responseMapName,
    responseMapType: analysis.responseMapType,
    returnType,
  };
}

/*
 * Build the request content-type map for an operation using shared logic.
 * Returns default request content type, count and the map type body.
 */
function buildRequestContentTypeMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
) {
  /* Use shared request body mapping logic */
  const result = generateRequestBodyMap(operation, operationId, typeImports);
  
  /* Merge type imports */
  result.typeImports.forEach((imp) => typeImports.add(imp));
  
  return {
    defaultRequestContentType: result.defaultContentType,
    requestContentTypeCount: result.contentTypeCount,
    requestMapType: result.requestMapType,
  };
}

/*
 * Internal helper that aggregates response schema type names with correct structure.
 * Fixed to use status code as primary key: Record<status, Record<contentType, ZodSchema>>
 * 
 * This function uses the shared response mapping logic to build the correct structure
 * where status code is the primary key, and for each status, a map from content type to schema.
 */
function buildResponseContentTypeMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
) {
  /* Use shared response mapping logic with correct structure */
  const result = generateResponseMap(operation, operationId, typeImports);
  
  /* Merge type imports */
  result.typeImports.forEach((imp) => typeImports.add(imp));
  
  return {
    defaultResponseContentType: result.defaultContentType,
    responseContentTypeCount: result.contentTypeCount,
    responseMapType: result.responseMapType,
  };
}

/*
 * Resolves a schema to a TypeScript type name. Inline schemas get a synthetic
 * operation-scoped name; referenced schemas reuse their component name.
 */
// Exported so server generator can reuse schema naming logic without duplication
function resolveSchemaTypeName(
  schema: ContentTypeMapping["schema"],
  operationId: string,
  suffix: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const originalSchemaName = schema.$ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in schema");
    const typeName = sanitizeIdentifier(originalSchemaName as string);
    typeImports.add(typeName);
    return typeName;
  }
  const sanitizedOperationId = sanitizeIdentifier(operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${suffix}`;
  typeImports.add(typeName);
  return typeName;
}

export { resolveSchemaTypeName };
