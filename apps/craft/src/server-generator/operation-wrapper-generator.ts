import type { OperationObject } from "openapi3-ts/oas31";

import assert from "assert";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { renderServerOperationWrapper } from "./templates/server-operation-templates.js";

/* Result of generating a server wrapper function */
export interface GeneratedServerWrapper {
  wrapperCode: string;
}

/*
 * Lightweight metadata for server wrapper generation.
 * All type/schema generation is now handled by the route-generator;
 * this module only needs minimal info to render the wrapper function.
 */
interface ServerWrapperMetadata {
  functionName: string;
  hasBody: boolean;
  method: string;
  operationId: string;
  pathKey: string;
  requestMapTypeName: string | undefined;
  responseMapTypeName: string;
  summary: string | undefined;
}

/*
 * Generates server operation wrapper function.
 * The wrapper imports all types and schemas from the corresponding route module.
 */
export function generateServerOperationWrapper(
  pathKey: string,
  method: string,
  operation: OperationObject,
): GeneratedServerWrapper {
  const metadata = extractServerWrapperMetadata(pathKey, method, operation);

  const wrapperCode = renderServerOperationWrapper({
    functionName: metadata.functionName,
    hasBody: metadata.hasBody,
    method: metadata.method,
    operationId: metadata.operationId,
    pathKey: metadata.pathKey,
    requestMapTypeName: metadata.requestMapTypeName,
    responseMapTypeName: metadata.responseMapTypeName,
    summary: metadata.summary,
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
  pathKey: string,
  method: string,
  operation: OperationObject,
): ServerWrapperMetadata {
  assert(operation.operationId, "Operation ID is required");
  const operationId = operation.operationId;
  const sanitizedId = sanitizeIdentifier(operationId);
  const hasBody = !!operation.requestBody;

  return {
    functionName: `${sanitizedId}Wrapper`,
    hasBody,
    method: method.toLowerCase(),
    operationId,
    pathKey,
    /* Request map is always generated in routes (even if empty) */
    requestMapTypeName: hasBody ? `${sanitizedId}RequestMap` : undefined,
    responseMapTypeName: `${sanitizedId}ResponseMap`,
    summary: operation.summary?.trim(),
  };
}
