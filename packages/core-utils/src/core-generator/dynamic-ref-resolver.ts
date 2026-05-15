import type { OpenAPIObject } from "openapi3-ts/oas31";

const COMPONENT_SCHEMAS_PREFIX = "#/components/schemas/";
const DYNAMIC_REF_KEY = "$dynamicRef";
const DYNAMIC_ANCHOR_KEY = "$dynamicAnchor";
const DOLLAR_DEFS_KEY = "$defs";
const REF_KEY = "$ref";
const DOLLAR_ID_KEY = "$id";

type JsonValue = JsonObject | JsonValue[] | boolean | null | number | string;
type JsonObject = { [key: string]: JsonValue | undefined };

/*
 * A consumer binding maps a dynamic anchor name to its resolution target.
 *
 * "self" bindings resolve to the consumer schema itself (used for recursive
 * types where the consumer declares $dynamicAnchor at root level).
 *
 * "schema" bindings resolve to a concrete schema definition (used when the
 * consumer provides a $defs entry that overrides the anchor).
 */
type AnchorBinding =
  | { kind: "schema"; schema: JsonObject }
  | { kind: "self"; consumerName: string };

interface ConsumerInfo {
  bindings: Map<string, AnchorBinding>;
  consumerName: string;
  consumerSchema: JsonObject;
  referenceLocation: ReferenceLocation;
  templateName: string;
}

type ReferenceLocation =
  | { index: number; kind: "allOf" }
  | { kind: "topLevel" };

/*
 * Pre-processes an OpenAPI 3.1 document to resolve $dynamicRef and
 * $dynamicAnchor keywords (JSON Schema 2020-12) into regular $ref pointers.
 *
 * This runs before the schema converter, so the Zod code generator only sees
 * standard $ref references. Consumer schemas that override dynamic anchors get
 * the template inlined with bindings resolved. Standalone templates resolve to
 * their own default anchors.
 *
 * Returns the number of $dynamicRef usages that were resolved.
 */
export function resolveDynamicReferences(openApiDoc: OpenAPIObject): number {
  const schemas = openApiDoc.components?.schemas;
  if (!schemas || Object.keys(schemas).length === 0) return 0;

  const schemaMap = schemas as Record<string, JsonObject>;

  /* Index which schemas are "templates" (contain $dynamicRef) */
  const templateNames = findTemplateSchemaNames(schemaMap);
  if (templateNames.size === 0) return 0;

  let resolvedCount = 0;

  /*
   * Phase 1: Identify and resolve consumer schemas first.
   * Consumers must be processed before templates because the consumer
   * resolution deep-clones the original template content. If we resolved
   * the template's $dynamicRef first, the cloned content would already
   * have the default binding instead of the consumer's override.
   */
  const consumers = identifyConsumers(schemaMap, templateNames);
  for (const consumer of consumers) {
    resolvedCount += resolveConsumer(consumer, schemaMap);
  }

  /*
   * Phase 2: Resolve remaining $dynamicRef in standalone templates
   * using their own default anchors (self-reference or $defs default).
   */
  for (const templateName of templateNames) {
    const schema = schemaMap[templateName];
    if (schema) {
      resolvedCount += resolveStandaloneDynamicRefs(
        templateName,
        schema,
        schemaMap,
      );
    }
  }

  /* Phase 3: Strip residual dynamic keywords from all schemas */
  cleanupAllDynamicKeywords(schemaMap);

  return resolvedCount;
}

/* Finds component schemas that contain $dynamicRef anywhere in their tree. */
function findTemplateSchemaNames(
  schemas: Record<string, JsonObject>,
): Set<string> {
  const templates = new Set<string>();

  for (const [name, schema] of Object.entries(schemas)) {
    if (containsDynamicRef(schema)) {
      templates.add(name);
    }
  }

  return templates;
}

function containsDynamicRef(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsDynamicRef);

  const obj = value as JsonObject;
  if (DYNAMIC_REF_KEY in obj) return true;
  return Object.values(obj).some(containsDynamicRef);
}

/*
 * Identifies consumer schemas: schemas that reference a template and provide
 * matching $dynamicAnchor overrides (either at root level or in $defs).
 */
function identifyConsumers(
  schemas: Record<string, JsonObject>,
  templateNames: Set<string>,
): ConsumerInfo[] {
  const consumers: ConsumerInfo[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    const bindings = extractBindings(name, schema);
    if (bindings.size === 0) continue;

    const ref = findTemplateReference(schema, templateNames);
    if (!ref) continue;

    consumers.push({
      bindings,
      consumerName: name,
      consumerSchema: schema,
      referenceLocation: ref.location,
      templateName: ref.templateName,
    });
  }

  return consumers;
}

/*
 * Extracts dynamic anchor bindings that a schema provides.
 *
 * Root-level $dynamicAnchor produces a self-reference binding.
 * $defs entries with $dynamicAnchor produce schema bindings.
 */
function extractBindings(
  schemaName: string,
  schema: JsonObject,
): Map<string, AnchorBinding> {
  const bindings = new Map<string, AnchorBinding>();

  if (typeof schema[DYNAMIC_ANCHOR_KEY] === "string") {
    bindings.set(schema[DYNAMIC_ANCHOR_KEY], {
      consumerName: schemaName,
      kind: "self",
    });
  }

  const defs = schema[DOLLAR_DEFS_KEY];
  if (isJsonObject(defs)) {
    for (const defSchema of Object.values(defs)) {
      if (!isJsonObject(defSchema)) continue;

      const anchorName = defSchema[DYNAMIC_ANCHOR_KEY];
      if (typeof anchorName !== "string") continue;

      const bindingSchema: JsonObject = {};
      for (const [key, value] of Object.entries(defSchema)) {
        if (key !== DYNAMIC_ANCHOR_KEY) {
          bindingSchema[key] = value;
        }
      }

      bindings.set(anchorName, { kind: "schema", schema: bindingSchema });
    }
  }

  return bindings;
}

/*
 * Finds a reference from this schema to a template schema.
 * Checks top-level $ref and allOf entries.
 */
function findTemplateReference(
  schema: JsonObject,
  templateNames: Set<string>,
): { location: ReferenceLocation; templateName: string } | undefined {
  if (typeof schema[REF_KEY] === "string") {
    const templateName = extractSchemaNameFromRef(schema[REF_KEY]);
    if (templateName && templateNames.has(templateName)) {
      return { location: { kind: "topLevel" }, templateName };
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (let i = 0; i < schema.allOf.length; i++) {
      const entry = schema.allOf[i];
      if (!isJsonObject(entry)) continue;

      const ref = entry[REF_KEY];
      if (typeof ref !== "string") continue;

      const templateName = extractSchemaNameFromRef(ref);
      if (templateName && templateNames.has(templateName)) {
        return { location: { index: i, kind: "allOf" }, templateName };
      }
    }
  }

  return undefined;
}

/*
 * Resolves a consumer schema by deep-cloning the referenced template and
 * replacing $dynamicRef nodes with the consumer's bindings.
 */
function resolveConsumer(
  consumer: ConsumerInfo,
  schemas: Record<string, JsonObject>,
): number {
  const template = schemas[consumer.templateName];
  if (!template) return 0;

  const clonedContent = deepCloneSchemaContent(template);
  const resolved = resolveDynamicRefsInTree(clonedContent, consumer.bindings);
  if (resolved === 0) return 0;

  if (consumer.referenceLocation.kind === "topLevel") {
    replaceSchemaContent(consumer.consumerSchema, clonedContent);
  } else {
    const allOf = consumer.consumerSchema.allOf as JsonValue[];
    allOf[consumer.referenceLocation.index] = clonedContent;
  }

  return resolved;
}

/*
 * Resolves $dynamicRef in standalone templates using their own anchors.
 * Root-level $dynamicAnchor resolves to self-reference (recursive).
 * $defs entries resolve to the default binding schema.
 */
function resolveStandaloneDynamicRefs(
  schemaName: string,
  schema: JsonObject,
  _schemas: Record<string, JsonObject>,
): number {
  const defaultBindings = new Map<string, AnchorBinding>();

  if (typeof schema[DYNAMIC_ANCHOR_KEY] === "string") {
    defaultBindings.set(schema[DYNAMIC_ANCHOR_KEY], {
      consumerName: schemaName,
      kind: "self",
    });
  }

  const defs = schema[DOLLAR_DEFS_KEY];
  if (isJsonObject(defs)) {
    for (const defSchema of Object.values(defs)) {
      if (!isJsonObject(defSchema)) continue;

      const anchorName = defSchema[DYNAMIC_ANCHOR_KEY];
      if (typeof anchorName !== "string") continue;
      if (defaultBindings.has(anchorName)) continue;

      const bindingSchema: JsonObject = {};
      for (const [key, value] of Object.entries(defSchema)) {
        if (key !== DYNAMIC_ANCHOR_KEY) {
          bindingSchema[key] = value;
        }
      }

      defaultBindings.set(anchorName, {
        kind: "schema",
        schema: bindingSchema,
      });
    }
  }

  if (defaultBindings.size === 0) return 0;
  return resolveDynamicRefsInTree(schema, defaultBindings);
}

/*
 * Deep-clones a schema's content, stripping $defs, $dynamicAnchor, and $id
 * at the root level. Sub-schemas are fully cloned with $dynamicRef preserved
 * so the caller can resolve them with the appropriate bindings.
 */
function deepCloneSchemaContent(schema: JsonObject): JsonObject {
  const result: JsonObject = {};

  for (const [key, value] of Object.entries(schema)) {
    if (
      key === DOLLAR_DEFS_KEY ||
      key === DYNAMIC_ANCHOR_KEY ||
      key === DOLLAR_ID_KEY
    ) {
      continue;
    }
    result[key] = deepCloneValue(value);
  }

  return result;
}

function deepCloneValue(value: unknown): JsonValue | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "object") return value as JsonValue;
  if (Array.isArray(value)) return value.map(deepCloneValue) as JsonValue[];

  const obj = value as JsonObject;
  const clone: JsonObject = {};

  for (const [k, v] of Object.entries(obj)) {
    clone[k] = deepCloneValue(v);
  }

  return clone;
}

/*
 * Walks a schema tree and replaces $dynamicRef nodes with the appropriate
 * binding. Returns the number of $dynamicRef nodes resolved.
 */
function resolveDynamicRefsInTree(
  value: unknown,
  bindings: Map<string, AnchorBinding>,
): number {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    let count = 0;
    for (const item of value) {
      count += resolveDynamicRefsInTree(item, bindings);
    }
    return count;
  }

  const record = value as JsonObject;
  let count = 0;

  if (typeof record[DYNAMIC_REF_KEY] === "string") {
    const anchorName = parseDynamicRefAnchor(record[DYNAMIC_REF_KEY]);
    if (anchorName) {
      const binding = bindings.get(anchorName);
      if (binding) {
        delete record[DYNAMIC_REF_KEY];

        if (binding.kind === "self") {
          record[REF_KEY] =
            `${COMPONENT_SCHEMAS_PREFIX}${binding.consumerName}`;
        } else {
          for (const [k, v] of Object.entries(binding.schema)) {
            record[k] = deepCloneValue(v);
          }
        }

        count++;
      }
    }
  }

  for (const v of Object.values(record)) {
    count += resolveDynamicRefsInTree(v, bindings);
  }

  return count;
}

/* Strips $dynamicAnchor, $dynamicRef, $id, and $defs from all schemas. */
function cleanupAllDynamicKeywords(schemas: Record<string, JsonObject>): void {
  for (const schema of Object.values(schemas)) {
    cleanupDynamicKeywordsInTree(schema);
  }
}

function cleanupDynamicKeywordsInTree(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) cleanupDynamicKeywordsInTree(item);
    return;
  }

  const record = value as JsonObject;
  delete record[DYNAMIC_ANCHOR_KEY];
  delete record[DOLLAR_ID_KEY];
  delete record[DOLLAR_DEFS_KEY];
  delete record[DYNAMIC_REF_KEY];

  for (const v of Object.values(record)) {
    cleanupDynamicKeywordsInTree(v);
  }
}

function replaceSchemaContent(target: JsonObject, source: JsonObject): void {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  for (const [key, value] of Object.entries(source)) {
    target[key] = value;
  }
}

function parseDynamicRefAnchor(dynamicRef: string): string | undefined {
  if (dynamicRef.startsWith("#")) {
    return dynamicRef.slice(1);
  }
  return undefined;
}

function extractSchemaNameFromRef(ref: string): string | undefined {
  if (ref.startsWith(COMPONENT_SCHEMAS_PREFIX)) {
    return ref.slice(COMPONENT_SCHEMAS_PREFIX.length);
  }
  return undefined;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
