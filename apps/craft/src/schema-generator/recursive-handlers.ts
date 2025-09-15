import type { SchemaObject } from "openapi3-ts/oas31";

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
  strictValidation?: boolean;
}

// Import from schema-converter to avoid circular dependencies
interface ZodSchemaResult {
  code: string;
  extensibleEnumValues?: unknown[];
  imports: Set<string>;
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

    if (
      typeof obj === "object" &&
      obj !== null &&
      "$ref" in obj &&
      typeof (obj as { $ref: unknown }).$ref === "string"
    ) {
      references.push((obj as { $ref: string }).$ref);
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

/**
 * Generates Zod code for a recursive array reference
 */
export function generateRecursiveArrayReference(
  referenceName: string,
  propertyName: string,
  options: RecursiveSchemaOptions = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  const finalSchemaName = strictValidation
    ? `${referenceName}Strict`
    : referenceName;

  const result: ZodSchemaResult = {
    code: `get ${propertyName}() { return z.array(${finalSchemaName}); }`,
    imports: new Set([finalSchemaName]),
  };

  return result;
}

/**
 * Generates Zod code for a recursive nullable reference
 */
export function generateRecursiveNullableReference(
  referenceName: string,
  propertyName: string,
  options: RecursiveSchemaOptions = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  const finalSchemaName = strictValidation
    ? `${referenceName}Strict`
    : referenceName;

  const result: ZodSchemaResult = {
    code: `get ${propertyName}() { return ${finalSchemaName}.nullable(); }`,
    imports: new Set([finalSchemaName]),
  };

  return result;
}

/**
 * Generates Zod code for a recursive optional reference
 */
export function generateRecursiveOptionalReference(
  referenceName: string,
  propertyName: string,
  options: RecursiveSchemaOptions = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  const finalSchemaName = strictValidation
    ? `${referenceName}Strict`
    : referenceName;

  const result: ZodSchemaResult = {
    code: `get ${propertyName}() { return ${finalSchemaName}.optional(); }`,
    imports: new Set([finalSchemaName]),
  };

  return result;
}

/**
 * Generates Zod code for a recursive reference using getter syntax
 */
export function generateRecursiveReference(
  referenceName: string,
  propertyName: string,
  options: RecursiveSchemaOptions = {},
): ZodSchemaResult {
  const { strictValidation = false } = options;
  const finalSchemaName = strictValidation
    ? `${referenceName}Strict`
    : referenceName;

  const result: ZodSchemaResult = {
    code: `get ${propertyName}() { return ${finalSchemaName}; }`,
    imports: new Set([finalSchemaName]),
  };

  return result;
}

/**
 * Gets the current depth of the reference stack
 */
export function getReferenceDepth(context: RecursiveContext): number {
  return context.referenceStack.length;
}

/**
 * Checks if a property is recursive for a given schema
 */
export function isRecursiveProperty(
  context: RecursiveContext,
  schemaName: string,
  propertyName: string,
): boolean {
  const recursiveProps = context.recursiveProperties.get(schemaName);
  return recursiveProps ? recursiveProps.has(propertyName) : false;
}

/**
 * Checks if a schema has been identified as recursive
 */
export function isRecursiveSchema(
  context: RecursiveContext,
  schemaName: string,
): boolean {
  return context.recursiveSchemas.has(schemaName);
}

/**
 * Pops a schema reference from the tracking stack
 */
export function popReference(context: RecursiveContext): string | undefined {
  return context.referenceStack.pop();
}

/**
 * Pushes a schema reference onto the tracking stack
 */
export function pushReference(
  context: RecursiveContext,
  referenceName: string,
): void {
  context.referenceStack.push(referenceName);
}

/**
 * Tracks a recursive property for a given schema
 */
export function trackRecursiveProperty(
  context: RecursiveContext,
  schemaName: string,
  propertyName: string,
): void {
  if (!context.recursiveProperties.has(schemaName)) {
    context.recursiveProperties.set(schemaName, new Set());
  }

  const existingProps = context.recursiveProperties.get(schemaName);
  if (existingProps) {
    existingProps.add(propertyName);
  }
}
