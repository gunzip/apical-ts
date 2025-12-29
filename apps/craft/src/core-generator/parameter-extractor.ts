import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import assert from "assert";

import type { ParameterGroups } from "../shared/models/parameter-models.js";
import type { SecurityHeader } from "../shared/models/security-models.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { extractParameterGroups } from "../shared/parameter-utils.js";
import { getOperationSecuritySchemes } from "../shared/security-utils.js";

/**
 * Metadata for operation parameters that need schema generation
 */
export interface OperationParameterMetadata {
  operationId: string;
  parameterGroups: ParameterGroups;
  securityHeaders?: SecurityHeader[];
}

/**
 * Extracts all parameter groups from operations for schema generation.
 * Returns a list of operations with their parameter groups that need Zod schemas.
 *
 * This will be used to generate parameter schemas (Query, Path, Headers)
 * in the schema generation phase, so that client and server generators
 * can import them instead of generating them inline.
 */
export function extractOperationParameters(
  openApiDoc: OpenAPIObject,
): OperationParameterMetadata[] {
  const operationParameters: OperationParameterMetadata[] = [];

  if (!openApiDoc.paths) {
    return operationParameters;
  }

  for (const [, pathItem] of Object.entries(openApiDoc.paths)) {
    const pathItemObj = pathItem;
    const pathLevelParameters = pathItemObj.parameters || [];

    // Define the HTTP methods we support with their corresponding operations
    const httpMethods: {
      method: string;
      operation: OperationObject | undefined;
    }[] = [
      { method: "get", operation: pathItemObj.get },
      { method: "post", operation: pathItemObj.post },
      { method: "put", operation: pathItemObj.put },
      { method: "delete", operation: pathItemObj.delete },
      { method: "patch", operation: pathItemObj.patch },
    ];

    for (const { operation } of httpMethods) {
      if (operation) {
        assert(operation.operationId, "Operation ID is missing");

        /* Extract parameter groups using existing logic from client generator */
        const parameterGroups = extractParameterGroups(
          operation,
          pathLevelParameters,
          openApiDoc,
        );

        /* Extract security headers for this operation */
        const securityHeaders = getOperationSecuritySchemes(
          operation,
          openApiDoc,
        );

        /* Always include operation parameters even if empty -
           we need to generate empty schemas for consistency */
        operationParameters.push({
          operationId: operation.operationId,
          parameterGroups,
          securityHeaders,
        });
      }
    }
  }

  return operationParameters;
}

/**
 * Gets the schema names that will be generated for operation parameters
 */
export function getParameterSchemaNames(operationId: string): {
  headersSchemaName: string;
  headersTypeName: string;
  pathSchemaName: string;
  pathTypeName: string;
  querySchemaName: string;
  queryTypeName: string;
} {
  const sanitizedId = sanitizeIdentifier(operationId);

  return {
    headersSchemaName: `${sanitizedId}HeadersSchema`,
    headersTypeName: `${sanitizedId}HeadersSchema`,
    pathSchemaName: `${sanitizedId}PathSchema`,
    pathTypeName: `${sanitizedId}PathSchema`,
    querySchemaName: `${sanitizedId}QuerySchema`,
    queryTypeName: `${sanitizedId}QuerySchema`,
  };
}
