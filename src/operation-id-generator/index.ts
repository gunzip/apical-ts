import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Apply generated operation IDs to OpenAPI document
 * Modifies the document in-place to add missing operation IDs
 */
export function applyGeneratedOperationIds(openApiDoc: OpenAPIObject): void {
  if (!openApiDoc.paths) {
    return;
  }

  const operationIds = generateUniqueOperationIds(openApiDoc.paths);

  for (const [path, pathItem] of Object.entries(openApiDoc.paths)) {
    const pathItemObj = pathItem;

    // Define the HTTP methods we support
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

    for (const { method, operation } of httpMethods) {
      if (operation) {
        const key = `${method}:${path}`;
        const generatedId = operationIds.get(key);
        if (generatedId && !operation.operationId) {
          operation.operationId = generatedId;
        }
      }
    }
  }
}

/**
 * Generate operation ID from HTTP method and path
 * Simple approach: method + path segments with collision avoidance
 */
export function generateOperationId(method: string, path: string): string {
  const normalizedMethod = method.toLowerCase();

  // Extract all path segments, including parameter names (without braces)
  const pathSegments = path
    .split("/")
    .filter((segment) => segment)
    .map((segment) => {
      // Remove braces from parameters but keep the parameter name
      if (segment.startsWith("{") && segment.endsWith("}")) {
        return segment.slice(1, -1);
      }
      return segment;
    })
    .map((segment) =>
      // Split by dashes and underscores and capitalize each word, then join
      segment
        .split(/[-_]/)
        .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
        .filter((word) => word)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(""),
    )
    .filter((segment) => segment);

  // Simple concatenation: method + all path parts
  const baseName = normalizedMethod + pathSegments.join("");

  // Use sanitizeIdentifier to ensure valid identifier
  return sanitizeIdentifier(baseName || normalizedMethod);
}

/**
 * Generate unique operation IDs with O(n) collision resolution
 * Groups collisions first, then resolves them in batch
 */
export function generateUniqueOperationIds(
  paths: Record<string, any>,
): Map<string, string> {
  const operationIds = new Map<string, string>();
  const collisionGroups = new Map<
    string,
    { key: string; method: string; path: string }[]
  >();

  // O(n) - First pass: group operations by their generated ID
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation && typeof operation === "object") {
        const key = `${method}:${path}`;
        const operationId = getOrGenerateOperationId(operation, method, path);

        if (!collisionGroups.has(operationId)) {
          collisionGroups.set(operationId, []);
        }
        collisionGroups.get(operationId)!.push({ key, method, path });
      }
    }
  }

  // O(n) - Second pass: resolve collisions in batch
  for (const [baseId, operations] of collisionGroups) {
    if (operations.length === 1) {
      // No collision
      operationIds.set(operations[0].key, baseId);
    } else {
      // Collision: assign sequential numbers
      operations.forEach((op, index) => {
        const uniqueId = index === 0 ? baseId : `${baseId}${index + 1}`;
        operationIds.set(op.key, uniqueId);
      });
    }
  }

  return operationIds;
}

/**
 * Get or generate operation ID for an OpenAPI operation
 */
export function getOrGenerateOperationId(
  operation: { operationId?: string },
  method: string,
  path: string,
): string {
  if (operation.operationId) {
    return sanitizeIdentifier(operation.operationId);
  }

  return generateOperationId(method, path);
}
