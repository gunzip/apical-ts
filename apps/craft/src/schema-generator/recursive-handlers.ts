import type { SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "./utils.js";

/**
 * Result of recursive reference analysis
 */
export interface RecursiveAnalysisResult {
  cyclePath?: string[];
  isDirectSelfReference?: boolean;
  isRecursive: boolean;
  referenceName?: string;
}

/**
 * Context for tracking recursive references during schema generation
 */
export interface RecursiveContext {
  /* Map of recursive properties within schemas */
  recursiveProperties: Map<string, Set<string>>;
  /* Set of schemas that have been identified as recursive */
  recursiveSchemas: Set<string>;
  /* Stack of currently processing schema references to detect cycles */
  referenceStack: string[];
}

/**
 * Options for recursive schema generation
 */
export interface RecursiveSchemaOptions {
  currentSchemaName?: string;
  propertyName?: string;
}

/**
 * Analyzes a reference to determine if it's recursive
 */
export function analyzeRecursiveReference(
  ref: string,
  context: RecursiveContext,
  currentSchemaName?: string,
): RecursiveAnalysisResult {
  if (!ref.startsWith("#/components/schemas/")) {
    return { isRecursive: false };
  }

  const referenceName = ref.replace("#/components/schemas/", "");
  const sanitizedReferenceName = sanitizeIdentifier(referenceName);

  /* Direct self-reference */
  if (currentSchemaName && sanitizedReferenceName === currentSchemaName) {
    context.recursiveSchemas.add(currentSchemaName);
    return {
      isDirectSelfReference: true,
      isRecursive: true,
      referenceName: sanitizedReferenceName,
    };
  }

  /* Check for circular reference in the current stack */
  const stackIndex = context.referenceStack.indexOf(sanitizedReferenceName);
  if (stackIndex !== -1) {
    const cyclePath = [
      ...context.referenceStack.slice(stackIndex),
      sanitizedReferenceName,
    ];

    /* Mark all schemas in the cycle as recursive */
    cyclePath.forEach((schemaName) => {
      context.recursiveSchemas.add(schemaName);
    });

    return {
      cyclePath,
      isDirectSelfReference: false,
      isRecursive: true,
      referenceName: sanitizedReferenceName,
    };
  }

  return { isRecursive: false, referenceName: sanitizedReferenceName };
}

/**
 * Analyzes a schema to determine if it's recursive by checking all its references
 */
export function analyzeSchemaForRecursion(
  schemaName: string,
  schema: SchemaObject,
): boolean {
  const refs = findReferencesInSchema(schema);
  const selfRef = `#/components/schemas/${schemaName}`;

  return refs.includes(selfRef);
}

/**
 * Creates a new recursive context for tracking references
 */
export function createRecursiveContext(): RecursiveContext {
  return {
    recursiveProperties: new Map(),
    recursiveSchemas: new Set(),
    referenceStack: [],
  };
}

/**
 * Analyzes a full schema object to find all references it contains
 */
export function findReferencesInSchema(schema: SchemaObject): string[] {
  const references: string[] = [];

  function extractRefs(obj: unknown): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    if (isReferenceObject(obj)) {
      references.push(obj.$ref);
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(extractRefs);
      return;
    }

    Object.values(obj).forEach(extractRefs);
  }

  extractRefs(schema);
  return references;
}
