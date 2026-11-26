import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
} from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "@apical-ts/core-utils";
import {
  extractParameterGroups,
  extractRequestContentTypes,
  getOperationSecuritySchemes,
} from "@apical-ts/core-utils/shared";
import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import {
  type BodyMode,
  renderServerOperationWrapper,
} from "./templates/server-operation-templates.js";

/* Result of generating a server wrapper function */
interface GeneratedServerWrapper {
  wrapperCode: string;
}

/*
 * Lightweight metadata for server wrapper generation.
 * All type/schema generation is now handled by the route-generator;
 * this module only needs minimal info to render the wrapper function.
 */
interface ServerWrapperMetadata {
  bodyMode: BodyMode;
  functionName: string;
  hasHeaders: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  operationId: string;
  requestContentTypes: string[];
  requestMapTypeName: string | undefined;
  responseMapTypeName: string;
}

/*
 * Generates server operation wrapper function.
 * The wrapper imports all types and schemas from the corresponding route module.
 */
export function generateServerOperationWrapper(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): GeneratedServerWrapper {
  void pathKey;
  void method;

  const metadata = extractServerWrapperMetadata(
    operation,
    pathLevelParameters,
    doc,
  );

  const wrapperCode = renderServerOperationWrapper({
    bodyMode: metadata.bodyMode,
    functionName: metadata.functionName,
    hasHeaders: metadata.hasHeaders,
    hasPath: metadata.hasPath,
    hasQuery: metadata.hasQuery,
    operationId: metadata.operationId,
    requestContentTypes: metadata.requestContentTypes,
    requestMapTypeName: metadata.requestMapTypeName,
    responseMapTypeName: metadata.responseMapTypeName,
  });

  return {
    wrapperCode,
  };
}

/*
 * Extracts minimal metadata needed for server wrapper generation.
 * All schema/type generation happens in route-generator.
 */
function extractServerWrapperMetadata(
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject,
): ServerWrapperMetadata {
  assert(operation.operationId, "Operation ID is required");
  const operationId = operation.operationId;
  const sanitizedId = sanitizeIdentifier(operationId);
  const resolvedRequestBody = resolveRequestBody(operation, doc);
  const requestContentTypes = resolvedRequestBody
    ? extractRequestContentTypes(resolvedRequestBody).contentTypes.map(
        (mapping) => mapping.contentType,
      )
    : [];
  const bodyMode: BodyMode =
    requestContentTypes.length === 0
      ? "none"
      : resolvedRequestBody?.required === true
        ? "required"
        : "optional";

  /* Extract parameter groups to determine which parameter types exist */
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc,
  );

  /* Extract security headers - same as route-generator */
  const securityHeaders = getOperationSecuritySchemes(operation, doc);

  return {
    bodyMode,
    functionName: `${sanitizedId}Wrapper`,
    hasHeaders:
      parameterGroups.headerParams.length > 0 || securityHeaders.length > 0,
    hasPath: parameterGroups.pathParams.length > 0,
    hasQuery: parameterGroups.queryParams.length > 0,
    operationId,
    requestContentTypes,
    /* Keep wrapper body handling aligned with the generated route request map. */
    requestMapTypeName:
      bodyMode === "none" ? undefined : `${sanitizedId}RequestMap`,
    responseMapTypeName: `${sanitizedId}ResponseMap`,
  };
}

function resolveRequestBody(
  operation: OperationObject,
  doc: OpenAPIObject,
): RequestBodyObject | undefined {
  if (!operation.requestBody) {
    return undefined;
  }
  if (!isReferenceObject(operation.requestBody)) {
    return operation.requestBody;
  }
  const refPrefix = "#/components/requestBodies/";
  if (!operation.requestBody.$ref.startsWith(refPrefix)) {
    return undefined;
  }
  const key = operation.requestBody.$ref.slice(refPrefix.length);
  const resolved = doc.components?.requestBodies?.[key];
  if (resolved && !isReferenceObject(resolved)) {
    return resolved;
  }
  return undefined;
}
