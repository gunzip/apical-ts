import type { OpenAPIObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";

/*
 * Renames schemas in components/schemas that conflict with:
 *  - Internal generator exported type names (e.g. ApiResponse)
 *  - Global / built-in JavaScript constructors or DOM-like types (Blob, Buffer, File, etc.)
 *  - Any explicitly reserved names defined below
 * The renaming strategy appends 'Schema' (and numeric suffix if needed) and updates every
 * $ref string pointing to the old schema name anywhere in the OpenAPI document.
 */
export function renameConflictingSchemas(openApiDoc: OpenAPIObject): number {
  if (!openApiDoc.components || !openApiDoc.components.schemas) return 0;
  const schemas = openApiDoc.components.schemas;

  const reservedNames = new Set<string>([
    /* Reserved & built-ins (sorted) */
    "ApiResponse",
    "ApiResponseError",
    "ApiResponseWithForcedParse",
    "ApiResponseWithParse",
    "Blob",
    "Buffer",
    "Date",
    "Error",
    "File",
    "FormData",
    "Headers",
    "Map",
    "Promise",
    "ReadableStream",
    "Request",
    "Response",
    "Set",
    "TransformStream",
    "URL",
    "URLSearchParams",
    "WeakMap",
    "WeakSet",
    "WritableStream",
  ]);

  const renameMap = new Map<string, string>();

  for (const originalName of Object.keys(schemas)) {
    if (!reservedNames.has(originalName)) continue;
    let candidate = `${originalName}Schema`;
    let counter = 2;
    while (
      schemas[candidate as keyof typeof schemas] ||
      renameMap.has(candidate)
    ) {
      candidate = `${originalName}Schema${counter++}`;
    }
    renameMap.set(originalName, candidate);
  }

  if (renameMap.size === 0) return 0; /* Nothing to do */

  /* Perform the actual renames (reconstruct object to avoid dynamic delete issues) */
  if (renameMap.size) {
    const rebuilt: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schemas)) {
      const newKey = renameMap.get(key) ?? key;
      rebuilt[newKey] = value as unknown;
    }
    // Remove existing keys
    for (const key of Object.keys(schemas)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (schemas as Record<string, unknown>)[key];
    }
    // Assign rebuilt
    for (const [key, value] of Object.entries(rebuilt)) {
      (schemas as Record<string, unknown>)[key] = value;
    }
  }

  const refPrefix = "#/components/schemas/";

  /* Walk entire document and rewrite $ref strings */
  const visit = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj.$ref === "string") {
        const ref: string = obj.$ref;
        if (ref.startsWith(refPrefix)) {
          const name = ref.substring(refPrefix.length);
          const renamed = renameMap.get(name);
          if (renamed) obj.$ref = refPrefix + renamed;
        }
      }
      for (const value of Object.values(obj)) visit(value);
    }
  };

  visit(openApiDoc);
  return renameMap.size;
}

/*
 * Renames schemas whose sanitized identifiers would collide with each other.
 * This prevents case-sensitivity conflicts when schemas like 'Catalog' and '_catalog'
 * both sanitize to similar identifiers, causing TypeScript import and filesystem issues.
 * The renaming strategy appends numeric suffixes and updates $ref pointers accordingly.
 */
export function renameSanitizationConflictingSchemas(
  openApiDoc: OpenAPIObject,
): number {
  if (!openApiDoc.components || !openApiDoc.components.schemas) return 0;
  const schemas = openApiDoc.components.schemas;

  // Pre-compute sanitized names for all schemas to leverage memoization
  const schemaNames = Object.keys(schemas);
  const sanitizedCache = new Map<string, string>();
  for (const originalName of schemaNames) {
    sanitizedCache.set(originalName, sanitizeIdentifier(originalName));
  }

  // Map from sanitized names (lowercase) to original schema names that would collide
  const sanitizedToOriginals = new Map<string, string[]>();

  // First pass: group original names by their sanitized equivalents (case-insensitive)
  for (const originalName of schemaNames) {
    const sanitized = sanitizedCache.get(originalName)!;
    const sanitizedLower = sanitized.toLowerCase();

    if (!sanitizedToOriginals.has(sanitizedLower)) {
      sanitizedToOriginals.set(sanitizedLower, []);
    }
    const existingList = sanitizedToOriginals.get(sanitizedLower);
    if (existingList) {
      existingList.push(originalName);
    }
  }

  // Find groups with more than one original name (collisions)
  const collisionGroups = Array.from(sanitizedToOriginals.entries()).filter(
    ([, originals]) => originals.length > 1,
  );

  if (collisionGroups.length === 0) return 0;

  const renameMap = new Map<string, string>();

  // Build a set of lowercase sanitized existing schema names for faster lookup
  const existingSanitizedLower = new Set(
    schemaNames.map((name) => sanitizedCache.get(name)!.toLowerCase()),
  );

  // For each collision group, rename all but the first schema
  for (const [, originals] of collisionGroups) {
    // Sort originals for deterministic behavior - keep the lexicographically first one unchanged
    const sortedOriginals = [...originals].sort();

    // Leave the first one unchanged, rename the rest
    for (let i = 1; i < sortedOriginals.length; i++) {
      const originalName = sortedOriginals[i];
      const baseSanitized = sanitizedCache.get(originalName)!;

      // Find a unique name by appending numeric suffix
      let candidate = `${baseSanitized}${i + 1}`;
      let counter = i + 1;

      // Ensure the candidate doesn't conflict with existing schemas or other renames
      while (
        schemas[candidate as keyof typeof schemas] ||
        renameMap.has(candidate) ||
        // Check if the new candidate would create another case-insensitive collision
        Array.from(renameMap.values()).some(
          (existing) => existing.toLowerCase() === candidate.toLowerCase(),
        ) ||
        (existingSanitizedLower.has(candidate.toLowerCase()) &&
          !renameMap.has(candidate))
      ) {
        counter++;
        candidate = `${baseSanitized}${counter}`;
      }

      renameMap.set(originalName, candidate);
    }
  }

  if (renameMap.size === 0) return 0;

  // Perform the actual renames (reconstruct object to avoid dynamic delete issues)
  const rebuilt: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schemas)) {
    const newKey = renameMap.get(key) ?? key;
    rebuilt[newKey] = value as unknown;
  }

  // Remove existing keys
  for (const key of Object.keys(schemas)) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (schemas as Record<string, unknown>)[key];
  }

  // Assign rebuilt
  for (const [key, value] of Object.entries(rebuilt)) {
    (schemas as Record<string, unknown>)[key] = value;
  }

  const refPrefix = "#/components/schemas/";

  // Walk entire document and rewrite $ref strings
  const visit = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj.$ref === "string") {
        const ref: string = obj.$ref;
        if (ref.startsWith(refPrefix)) {
          const name = ref.substring(refPrefix.length);
          const renamed = renameMap.get(name);
          if (renamed) obj.$ref = refPrefix + renamed;
        }
      }
      for (const value of Object.values(obj)) visit(value);
    }
  };

  visit(openApiDoc);
  return renameMap.size;
}
