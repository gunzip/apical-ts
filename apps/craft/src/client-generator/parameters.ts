import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { assert } from "console";
import { isReferenceObject } from "openapi3-ts/oas31";

import type { ParameterGroups } from "./models/parameter-models.js";

/* Re-export types for backward compatibility */
export type { ParameterGroups } from "./models/parameter-models.js";

/**
 * Extracts and groups parameters from operation and path-level definitions
 */
export function extractParameterGroups(
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject,
): ParameterGroups {
  // Resolve parameter references and combine path-level and operation-level parameters
  const resolvedPathLevelParams = pathLevelParameters.map((p) =>
    resolveParameterReference(p, doc),
  );
  const resolvedOperationParams = (operation.parameters || []).map((p) =>
    resolveParameterReference(p, doc),
  );
  const allParameters = [
    ...resolvedPathLevelParams,
    ...resolvedOperationParams,
  ];

  return {
    headerParams: allParameters.filter((p) => p.in === "header"),
    pathParams: allParameters.filter((p) => p.in === "path"),
    queryParams: allParameters.filter((p) => p.in === "query"),
  };
}

/**
 * Resolves parameter references to actual parameter objects
 */
export function resolveParameterReference(
  param: ParameterObject | ReferenceObject,
  doc: OpenAPIObject,
): ParameterObject {
  if (isReferenceObject(param)) {
    const refPath = param.$ref.replace("#/", "").split("/");
    let resolved = doc as unknown;
    for (const segment of refPath) {
      assert(
        typeof resolved === "object" && resolved !== null,
        `Missing reference: ${segment}`,
      );
      resolved = (resolved as Record<string, unknown>)[segment];
    }
    return resolved as ParameterObject;
  }
  return param;
}
