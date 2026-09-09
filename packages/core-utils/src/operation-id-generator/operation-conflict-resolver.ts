import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

interface SanitizedOperation {
  operation: OperationObject;
  sanitized: string;
}

/**
 * Renames operation IDs whose sanitized identifiers collide case-insensitively
 * (e.g. "DeleteWebhook" and "deleteWebhook"). Such operation IDs produce
 * function and file names that differ only in casing, which breaks on
 * case-insensitive filesystems and makes tsc fail with TS1149.
 *
 * The first operation of each collision group (deterministically sorted) keeps
 * its name; the others receive a numeric suffix. Operation IDs are rewritten
 * in-place so every downstream generator (client, server, routes, schemas,
 * index barrels) stays consistent.
 *
 * Complexity is linear in the number of operations (a single pass over all
 * operations, one sanitize per operation) plus an O(k log k) sort per collision
 * group, where k is the (typically tiny) group size. When no collisions exist
 * the pass only builds grouping state and returns 0.
 */
export function renameSanitizationConflictingOperationIds(
  openApiDoc: OpenAPIObject,
): number {
  if (!openApiDoc.paths) return 0;

  const groupedBySanitized = new Map<string, SanitizedOperation[]>();
  const takenNames = new Set<string>();

  for (const pathItem of Object.values(openApiDoc.paths)) {
    const pathItemObj = pathItem as Record<
      string,
      OperationObject | undefined
    > | null;
    if (!pathItemObj || typeof pathItemObj !== "object") continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItemObj[method];
      if (!operation || !operation.operationId) continue;

      const sanitized = sanitizeIdentifier(operation.operationId);
      const key = sanitized.toLowerCase();
      takenNames.add(key);

      let group = groupedBySanitized.get(key);
      if (!group) {
        group = [];
        groupedBySanitized.set(key, group);
      }
      group.push({ operation, sanitized });
    }
  }

  let renamedCount = 0;

  for (const group of groupedBySanitized.values()) {
    if (group.length < 2) continue;

    group.sort((a, b) => {
      if (a.sanitized < b.sanitized) return -1;
      if (a.sanitized > b.sanitized) return 1;
      return 0;
    });

    for (let i = 1; i < group.length; i++) {
      const { operation, sanitized } = group[i];

      let counter = 2;
      let candidate = `${sanitized}${counter}`;

      while (takenNames.has(candidate.toLowerCase())) {
        counter += 1;
        candidate = `${sanitized}${counter}`;
      }

      operation.operationId = candidate;
      takenNames.add(candidate.toLowerCase());
      renamedCount += 1;
    }
  }

  return renamedCount;
}
