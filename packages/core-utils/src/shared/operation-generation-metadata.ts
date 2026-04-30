import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

import type { ContentTypeMaps } from "./content-type-maps.js";
import type { ParameterGroups } from "./models/parameter-models.js";
import type { SecurityHeader } from "./models/security-models.js";
import {
  extractAllOperations,
  type OperationMetadata,
} from "./operation-extractor.js";
import { extractParameterGroups } from "./parameter-utils.js";
import {
  generateRequestBodyMap,
  type RequestBodyMapResult,
} from "./request-body-maps.js";
import {
  generateResponseMap,
  type ResponseMapResult,
} from "./response-maps.js";
import {
  getOperationSecuritySchemes,
  hasSecurityOverride,
} from "./security-utils.js";

export interface OperationBodyGenerationMetadata {
  contentTypeMaps: ContentTypeMaps;
  hasRequestBody: boolean;
  requestBodyMap: RequestBodyMapResult;
  requestContentTypes: string[];
  responseMap: ResponseMapResult;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
}

export interface OperationParameterInfo {
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
}

export interface OperationGenerationMetadata extends OperationMetadata {
  bodyInfo: OperationBodyGenerationMetadata;
  functionName: string;
  operationName: string;
  operationSecurityHeaders: SecurityHeader[];
  overridesSecurity: boolean;
  parameterGroups: ParameterGroups;
  parameterInfo: OperationParameterInfo;
}

interface OperationGenerationMetadataConfig {
  doc: OpenAPIObject;
  method: string;
  operation: OperationObject;
  pathKey: string;
  pathLevelParameters?: (ParameterObject | ReferenceObject)[];
}

export function extractAllOperationGenerationMetadata(
  doc: OpenAPIObject,
): OperationGenerationMetadata[] {
  return extractAllOperations(doc).map(
    ({ method, operation, pathKey, pathLevelParameters }) =>
      extractOperationGenerationMetadata({
        doc,
        method,
        operation,
        pathKey,
        pathLevelParameters,
      }),
  );
}

export function extractOperationGenerationMetadata({
  doc,
  method,
  operation,
  pathKey,
  pathLevelParameters = [],
}: OperationGenerationMetadataConfig): OperationGenerationMetadata {
  assert(operation.operationId, "Operation ID is required");

  const operationId = operation.operationId;
  const functionName = sanitizeIdentifier(operationId);
  const operationName =
    functionName.charAt(0).toUpperCase() + functionName.slice(1);
  const resolvedSchemas = doc.components?.schemas;

  const requestBodyMap = generateRequestBodyMap(
    operation,
    operationId,
    new Set<string>(),
    resolvedSchemas,
  );
  const responseMap = generateResponseMap(
    operation,
    operationId,
    new Set<string>(),
    doc,
    {},
    resolvedSchemas,
  );

  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );
  const operationSecurityHeaders = getOperationSecuritySchemes(operation, doc);
  const hasRequiredSecurityHeader = operationSecurityHeaders.some(
    (securityHeader) => securityHeader.isRequired,
  );
  const isHeadersOptional =
    parameterGroups.headerParams.every(
      (parameter) => parameter.required !== true,
    ) && !hasRequiredSecurityHeader;
  const isQueryOptional = parameterGroups.queryParams.every(
    (parameter) => parameter.required !== true,
  );
  const hasRequestBody = operation.requestBody !== undefined;

  return {
    bodyInfo: {
      contentTypeMaps: createContentTypeMaps(requestBodyMap, responseMap),
      hasRequestBody,
      requestBodyMap,
      requestContentTypes: extractRequestContentTypes(operation),
      responseMap,
      shouldGenerateRequestMap:
        hasRequestBody && requestBodyMap.requestMapType !== "{}",
      shouldGenerateResponseMap: responseMap.responseMapType !== "{}",
    },
    functionName,
    method,
    operation,
    operationId,
    operationName,
    operationSecurityHeaders,
    overridesSecurity: hasSecurityOverride(operation),
    parameterGroups,
    parameterInfo: {
      hasHeaders:
        parameterGroups.headerParams.length > 0 ||
        operationSecurityHeaders.length > 0,
      hasPath: parameterGroups.pathParams.length > 0,
      hasQuery: parameterGroups.queryParams.length > 0,
      isHeadersOptional,
      isQueryOptional,
    },
    pathKey,
    pathLevelParameters,
  };
}

function createContentTypeMaps(
  requestBodyMap: RequestBodyMapResult,
  responseMap: ResponseMapResult,
): ContentTypeMaps {
  const typeImports = new Set<string>();

  for (const typeImport of requestBodyMap.typeImports) {
    typeImports.add(typeImport);
  }
  for (const typeImport of responseMap.typeImports) {
    typeImports.add(typeImport);
  }

  return {
    defaultRequestContentType: requestBodyMap.defaultContentType,
    defaultResponseContentType: responseMap.defaultContentType,
    requestContentTypeCount: requestBodyMap.contentTypeCount,
    requestMapType: requestBodyMap.requestMapType,
    responseContentTypeCount: responseMap.contentTypeCount,
    responseMapType: responseMap.responseMapType,
    typeImports,
  };
}

function extractRequestContentTypes(operation: OperationObject): string[] {
  if (!operation.requestBody || isReferenceObject(operation.requestBody)) {
    return [];
  }

  return Object.keys(operation.requestBody.content ?? {});
}
