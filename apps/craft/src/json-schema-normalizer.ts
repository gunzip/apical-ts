import type { OpenAPIObject } from "openapi3-ts/oas31";

import path from "node:path";

import { sanitizeIdentifier } from "@apical-ts/core-utils";

const DEFAULT_INFO_TITLE = "JSON Schema Input";
const DEFAULT_INFO_VERSION = "1.0.0";
const DEFAULT_ROOT_SCHEMA_NAME = "RootSchema";

const JSON_SCHEMA_KEYWORDS = new Set([
  "$anchor",
  "$defs",
  "$dynamicAnchor",
  "$dynamicRef",
  "$id",
  "$ref",
  "$schema",
  "$vocabulary",
  "additionalProperties",
  "allOf",
  "anyOf",
  "const",
  "contains",
  "contentEncoding",
  "contentMediaType",
  "definitions",
  "dependentRequired",
  "dependentSchemas",
  "else",
  "enum",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "if",
  "items",
  "maxContains",
  "maximum",
  "minContains",
  "minimum",
  "multipleOf",
  "not",
  "oneOf",
  "patternProperties",
  "prefixItems",
  "properties",
  "propertyNames",
  "required",
  "then",
  "type",
  "unevaluatedItems",
  "unevaluatedProperties",
]);

export interface JsonSchemaNormalizationOptions {
  sourcePath?: string;
}

export interface NormalizedJsonSchemaDocument {
  document: OpenAPIObject;
  rootSchemaName: string;
}

interface JsonSchemaRefRewriteContext {
  definitionNameMap: Map<string, string>;
  dollarDefsNameMap: Map<string, string>;
  rootSchemaName: string;
  visited: WeakMap<object, unknown>;
}

type JsonSchemaObject = Record<string, unknown>;

/*
 * Heuristic detection for raw JSON Schema input.
 *
 * Examples:
 * - `{ openapi: "3.1.0", ... }` => false
 * - `{ $schema: "...", type: "object" }` => true
 * - `false` => true (boolean JSON Schema root)
 */
export function isRawJsonSchemaDocument(parsed: unknown): boolean {
  if (typeof parsed === "boolean") {
    return true;
  }

  if (!isRecord(parsed)) {
    return false;
  }

  if (hasOpenAPIVersionMarker(parsed)) {
    return false;
  }

  return Object.keys(parsed).some((key) => JSON_SCHEMA_KEYWORDS.has(key));
}

/*
 * Wrap a raw JSON Schema document into the OpenAPI shape expected by the rest
 * of the pipeline.
 *
 * Example:
 * - input root:
 *   {
 *     title: "Person",
 *     $defs: { Address: { type: "object" } },
 *     properties: { address: { $ref: "#/$defs/Address" } }
 *   }
 *
 * - normalized output:
 *   {
 *     openapi: "3.1.0",
 *     components: {
 *       schemas: {
 *         Address: { type: "object" },
 *         Person: {
 *           properties: { address: { $ref: "#/components/schemas/Address" } }
 *         }
 *       }
 *     }
 *   }
 */
export function normalizeRawJsonSchemaDocument(
  parsed: unknown,
  options: JsonSchemaNormalizationOptions = {},
): NormalizedJsonSchemaDocument {
  const usedSchemaNames = new Set<string>();
  const rootSchemaName = createUniqueSchemaName(
    getRootSchemaName(parsed, options.sourcePath),
    usedSchemaNames,
  );
  const rootSchemaObject = isRecord(parsed) ? parsed : undefined;
  const dollarDefs = getDefinitionEntries(rootSchemaObject?.$defs);
  const definitions = getDefinitionEntries(rootSchemaObject?.definitions);
  const dollarDefsNameMap = createDefinitionNameMap(
    dollarDefs,
    usedSchemaNames,
  );
  const definitionNameMap = createDefinitionNameMap(
    definitions,
    usedSchemaNames,
  );
  const rewriteContext: JsonSchemaRefRewriteContext = {
    definitionNameMap,
    dollarDefsNameMap,
    rootSchemaName,
    visited: new WeakMap<object, unknown>(),
  };
  const schemas: Record<string, unknown> = {};

  for (const [name, schema] of dollarDefs.entries()) {
    const mappedName = dollarDefsNameMap.get(name);
    if (!mappedName) {
      throw new Error(
        `Missing normalized component name for $defs entry '${name}'`,
      );
    }
    schemas[mappedName] = rewriteJsonSchemaRefs(schema, rewriteContext);
  }

  for (const [name, schema] of definitions.entries()) {
    const mappedName = definitionNameMap.get(name);
    if (!mappedName) {
      throw new Error(
        `Missing normalized component name for definitions entry '${name}'`,
      );
    }
    schemas[mappedName] = rewriteJsonSchemaRefs(schema, rewriteContext);
  }

  schemas[rootSchemaName] =
    rootSchemaObject !== undefined
      ? rewriteJsonSchemaRefs(
          omitRootDefinitions(rootSchemaObject),
          rewriteContext,
        )
      : parsed;

  const components = {
    schemas: schemas as NonNullable<OpenAPIObject["components"]>["schemas"],
  };

  return {
    document: {
      components,
      info: {
        title: getInfoTitle(rootSchemaObject, rootSchemaName),
        version: DEFAULT_INFO_VERSION,
      },
      openapi: "3.1.0",
      paths: {},
    },
    rootSchemaName,
  };
}

/*
 * Deeply clone arrays/objects while rewriting supported local JSON Schema refs.
 *
 * The WeakMap avoids re-walking the same object graph and preserves recursive
 * structures when a schema points back to itself.
 */
function rewriteJsonSchemaRefs(
  value: unknown,
  context: JsonSchemaRefRewriteContext,
): unknown {
  if (Array.isArray(value)) {
    const cachedArray = context.visited.get(value);
    if (cachedArray) {
      return cachedArray;
    }

    const rewrittenArray: unknown[] = [];
    context.visited.set(value, rewrittenArray);

    value.forEach((item, index) => {
      rewrittenArray[index] = rewriteJsonSchemaRefs(item, context);
    });

    return rewrittenArray;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const cachedValue = context.visited.get(value);
  if (cachedValue) {
    return cachedValue;
  }

  const rewrittenObject: Record<string, unknown> = {};
  context.visited.set(value, rewrittenObject);

  for (const [key, entry] of Object.entries(value)) {
    if (key === "$ref" && typeof entry === "string") {
      rewrittenObject[key] = rewriteJsonSchemaRef(entry, context);
      continue;
    }

    rewrittenObject[key] = rewriteJsonSchemaRefs(entry, context);
  }

  return rewrittenObject;
}

/*
 * Translate raw JSON Schema local refs into the component-based refs used by
 * the OpenAPI schema generator.
 *
 * Examples:
 * - `#` => `#/components/schemas/Person`
 * - `#/$defs/Address` => `#/components/schemas/Address`
 * - `#/definitions/LegacyTag` => `#/components/schemas/LegacyTag`
 */
function rewriteJsonSchemaRef(
  ref: string,
  context: JsonSchemaRefRewriteContext,
): string {
  if (!ref.startsWith("#")) {
    return ref;
  }

  if (ref === "" || ref === "#") {
    return toComponentSchemaRef(context.rootSchemaName);
  }

  if (ref.startsWith("#/components/schemas/")) {
    return ref;
  }

  const pointerSegments = parseJsonPointer(ref);
  if (!pointerSegments) {
    return ref;
  }

  if (pointerSegments.length === 2 && pointerSegments[0] === "$defs") {
    return toMappedComponentSchemaRef(
      ref,
      pointerSegments[1],
      context.dollarDefsNameMap,
    );
  }

  if (pointerSegments.length === 2 && pointerSegments[0] === "definitions") {
    return toMappedComponentSchemaRef(
      ref,
      pointerSegments[1],
      context.definitionNameMap,
    );
  }

  throw new Error(
    `Unsupported raw JSON Schema local $ref '${ref}'. Only '#', '#/$defs/<name>', and '#/definitions/<name>' are supported.`,
  );
}

/*
 * Resolve a definition name through the normalized name map.
 *
 * Example:
 * - original `$defs` key: `postal-address`
 * - normalized component name: `postalAddress`
 * - resulting ref: `#/components/schemas/postalAddress`
 */
function toMappedComponentSchemaRef(
  ref: string,
  definitionName: string,
  nameMap: Map<string, string>,
): string {
  const mappedName = nameMap.get(definitionName);
  if (!mappedName) {
    throw new Error(`Unable to resolve raw JSON Schema $ref target '${ref}'`);
  }

  return toComponentSchemaRef(mappedName);
}

function toComponentSchemaRef(schemaName: string): string {
  return `#/components/schemas/${schemaName}`;
}

/*
 * Parse a JSON Pointer while decoding both JSON Pointer escapes and any
 * percent-encoded characters in the path.
 *
 * Example:
 * - `#/$defs/Foo~1Bar` => ["$defs", "Foo/Bar"]
 */
function parseJsonPointer(ref: string): string[] | undefined {
  if (ref === "#") {
    return [];
  }

  if (!ref.startsWith("#/")) {
    return undefined;
  }

  return ref
    .slice(2)
    .split("/")
    .map((segment) => decodeJsonPointerSegment(segment));
}

function decodeJsonPointerSegment(segment: string): string {
  const decodedUriSegment = segment.includes("%")
    ? decodeURIComponent(segment)
    : segment;

  return decodedUriSegment.replaceAll("~1", "/").replaceAll("~0", "~");
}

/*
 * Build the stable mapping between original JSON Schema definition keys and the
 * component names exposed to the rest of the generator.
 *
 * Example:
 * - definitions: `postal-address`, `postal_address`
 * - mapped names: `postalAddress`, `postalAddress2`
 */
function createDefinitionNameMap(
  definitions: Map<string, unknown>,
  usedSchemaNames: Set<string>,
): Map<string, string> {
  const nameMap = new Map<string, string>();

  for (const definitionName of [...definitions.keys()].sort()) {
    nameMap.set(
      definitionName,
      createUniqueSchemaName(definitionName, usedSchemaNames),
    );
  }

  return nameMap;
}

/*
 * Ensure every emitted component schema name is unique after sanitization.
 *
 * Example:
 * - first `postal-address` => `postalAddress`
 * - second colliding name => `postalAddress2`
 */
function createUniqueSchemaName(
  candidate: string,
  usedSchemaNames: Set<string>,
): string {
  const baseName = sanitizeSchemaName(candidate);
  let uniqueName = baseName;
  let suffix = 2;

  while (usedSchemaNames.has(uniqueName)) {
    uniqueName = `${baseName}${suffix++}`;
  }

  usedSchemaNames.add(uniqueName);
  return uniqueName;
}

function sanitizeSchemaName(candidate: string): string {
  const trimmedCandidate = candidate.trim();

  if (!trimmedCandidate) {
    return DEFAULT_ROOT_SCHEMA_NAME;
  }

  try {
    return sanitizeIdentifier(trimmedCandidate);
  } catch {
    return DEFAULT_ROOT_SCHEMA_NAME;
  }
}

/*
 * Prefer the schema `title`, then the input file name, then a generic fallback.
 *
 * Examples:
 * - `{ title: "Person" }` => `Person`
 * - `customer-profile.yaml` => `customerProfile`
 * - boolean root without source path => `RootSchema`
 */
function getRootSchemaName(parsed: unknown, sourcePath?: string): string {
  if (
    isRecord(parsed) &&
    typeof parsed.title === "string" &&
    parsed.title.trim()
  ) {
    return parsed.title.trim();
  }

  const fileStem = getSourceFileStem(sourcePath);
  if (fileStem) {
    return fileStem;
  }

  return DEFAULT_ROOT_SCHEMA_NAME;
}

function getInfoTitle(
  parsed: JsonSchemaObject | undefined,
  rootSchemaName: string,
): string {
  if (typeof parsed?.title === "string" && parsed.title.trim()) {
    return parsed.title.trim();
  }

  return rootSchemaName || DEFAULT_INFO_TITLE;
}

function getSourceFileStem(sourcePath?: string): string | undefined {
  if (!sourcePath) {
    return undefined;
  }

  let sourceName = sourcePath;

  try {
    sourceName = new URL(sourcePath).pathname || sourcePath;
  } catch {
    sourceName = sourcePath;
  }

  const baseName = path.basename(sourceName);
  if (!baseName) {
    return undefined;
  }

  const extension = path.extname(baseName);
  return extension ? baseName.slice(0, -extension.length) : baseName;
}

/*
 * Strip root-only definition containers after their entries have been hoisted to
 * `components.schemas`.
 *
 * Example:
 * - root before: `{ $defs: {...}, properties: {...} }`
 * - root after: `{ properties: {...} }`
 */
function omitRootDefinitions(schema: JsonSchemaObject): JsonSchemaObject {
  const result: JsonSchemaObject = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "$defs" || key === "definitions") {
      continue;
    }

    result[key] = value;
  }

  return result;
}

function getDefinitionEntries(value: unknown): Map<string, unknown> {
  if (!isRecord(value)) {
    return new Map<string, unknown>();
  }

  return new Map(Object.entries(value));
}

function hasOpenAPIVersionMarker(parsed: JsonSchemaObject): boolean {
  return (
    typeof parsed.openapi === "string" || typeof parsed.swagger === "string"
  );
}

function isRecord(value: unknown): value is JsonSchemaObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
