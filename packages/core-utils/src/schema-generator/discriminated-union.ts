import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject, isSchemaObject } from "openapi3-ts/oas31";

import type { ResolvedSchemas } from "./types.js";
import { parseSchemaReference } from "./schema-references.js";
import { isNullable } from "./utils.js";

interface DiscriminatedUnionMember {
  code: string;
  schema: ReferenceObject | SchemaObject;
}

interface DiscriminatorMapping {
  [literalValue: string]: string;
}

interface BuildDiscriminatedUnionCodeOptions {
  discriminatorProperty: string;
  mapping?: DiscriminatorMapping;
  members: DiscriminatedUnionMember[];
  resolvedSchemas?: ResolvedSchemas;
}

interface ResolvedDiscriminatedUnionMemberCompatibilityOptions {
  narrowing?: DiscriminatorNarrowing;
  resolvedSchemas?: ResolvedSchemas;
  seenRefs?: Set<string>;
}

/*
 * How a member must be rendered so a non-static discriminator still yields a
 * valid discriminated union option:
 * - "none": emit the member code as-is
 * - "unsupported": narrowing is required but impossible, fall back to z.union
 * - { literals }: narrow the discriminator property with these mapping keys
 */
type DiscriminatorNarrowing = "none" | "unsupported" | { literals: string[] };

const BARE_IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

function isNarrowed(
  narrowing: DiscriminatorNarrowing,
): narrowing is { literals: string[] } {
  return typeof narrowing === "object";
}

export function buildDiscriminatedUnionCode(
  options: BuildDiscriminatedUnionCodeOptions,
): string {
  const { discriminatorProperty, mapping, members, resolvedSchemas } = options;
  const memberCodes = members.map((member) => member.code);
  const narrowings = members.map((member) =>
    planDiscriminatorNarrowing(
      member,
      discriminatorProperty,
      mapping,
      resolvedSchemas,
    ),
  );

  if (narrowings.some((narrowing) => narrowing === "unsupported")) {
    return renderPlainUnion(memberCodes);
  }

  if (
    !members.every((member, index) =>
      isDiscriminatedUnionMemberCompatible(
        member.schema,
        discriminatorProperty,
        resolvedSchemas,
        undefined,
        narrowings[index],
      ),
    )
  ) {
    return renderPlainUnion(memberCodes);
  }

  const nullableFlags = members.map((member) =>
    isDiscriminatedUnionMemberNullable(member.schema, resolvedSchemas),
  );

  if (!nullableFlags.some(Boolean)) {
    return renderDiscriminatedUnion(
      discriminatorProperty,
      memberCodes.map((code, index) =>
        applyDiscriminatorNarrowing(
          code,
          discriminatorProperty,
          narrowings[index],
        ),
      ),
    );
  }

  if (!nullableFlags.every(Boolean)) {
    return renderPlainUnion(memberCodes);
  }

  const unwrappedMemberCodes: string[] = [];
  for (const [index, member] of members.entries()) {
    const unwrappedMemberCode = unwrapNullableDiscriminatedUnionMember(
      member,
      resolvedSchemas,
    );
    if (unwrappedMemberCode === null) {
      return renderPlainUnion(memberCodes);
    }
    unwrappedMemberCodes.push(
      applyDiscriminatorNarrowing(
        unwrappedMemberCode,
        discriminatorProperty,
        narrowings[index],
      ),
    );
  }

  return `${renderDiscriminatedUnion(discriminatorProperty, unwrappedMemberCodes)}.nullable()`;
}

/*
 * Zod v4 rejects non-object options in z.discriminatedUnion, so mapped members
 * whose discriminator is not a static literal must have that property replaced
 * by the mapping key. Members that already declare a const/enum discriminator
 * are left untouched to avoid overriding the authored literal.
 *
 * Narrowing always yields a literal, so a discriminator property that the
 * member leaves optional becomes required, as z.discriminatedUnion needs it.
 */
function planDiscriminatorNarrowing(
  member: DiscriminatedUnionMember,
  discriminatorProperty: string,
  mapping: DiscriminatorMapping | undefined,
  resolvedSchemas: ResolvedSchemas | undefined,
): DiscriminatorNarrowing {
  if (!mapping || !isReferenceObject(member.schema)) {
    return "none";
  }

  const literals = findMappingKeys(member.schema.$ref, mapping);
  if (literals.length === 0) {
    return "none";
  }

  const resolvedSchema = resolveReferencedSchema(
    member.schema,
    resolvedSchemas,
  );
  if (!resolvedSchema) {
    return "none";
  }

  const refName = parseSchemaReference(member.schema.$ref);
  const seenRefs = new Set<string>(refName ? [refName.originalName] : []);

  /*
   * Self-referencing allOf compositions are emitted as z.intersection, which
   * has no .extend, so they cannot be narrowed.
   */
  if (
    refName &&
    hasSelfReferencingAllOf(resolvedSchema, refName.originalName)
  ) {
    return "unsupported";
  }

  const discriminatorSchema = findDiscriminatorProperty(
    resolvedSchema,
    discriminatorProperty,
    resolvedSchemas,
    seenRefs,
  );
  if (
    !discriminatorSchema ||
    isStaticDiscriminatorSchema(discriminatorSchema, resolvedSchemas, seenRefs)
  ) {
    return "none";
  }

  if (
    !BARE_IDENTIFIER_PATTERN.test(member.code) ||
    !isStringLikeDiscriminatorSchema(
      discriminatorSchema,
      resolvedSchemas,
      seenRefs,
    )
  ) {
    return "unsupported";
  }

  return { literals };
}

function applyDiscriminatorNarrowing(
  code: string,
  discriminatorProperty: string,
  narrowing: DiscriminatorNarrowing,
): string {
  if (!isNarrowed(narrowing)) {
    return code;
  }

  const literalCode =
    narrowing.literals.length === 1
      ? `z.literal(${JSON.stringify(narrowing.literals[0])})`
      : `z.enum([${narrowing.literals.map((literal) => JSON.stringify(literal)).join(", ")}])`;

  return `${code}.extend({ ${JSON.stringify(discriminatorProperty)}: ${literalCode} })`;
}

function hasSelfReferencingAllOf(
  schema: SchemaObject,
  originalName: string,
): boolean {
  return (schema.allOf ?? []).some((member) => {
    if (!isReferenceObject(member)) {
      return false;
    }

    return parseSchemaReference(member.$ref)?.originalName === originalName;
  });
}

/*
 * Mapping keys are strings, so narrowing is only sound for string-ish
 * discriminator properties.
 */
function isStringLikeDiscriminatorSchema(
  schema: ReferenceObject | SchemaObject,
  resolvedSchemas?: ResolvedSchemas,
  seenRefs = new Set<string>(),
): boolean {
  if (isReferenceObject(schema)) {
    const refName = parseSchemaReference(schema.$ref);
    if (!refName || seenRefs.has(refName.originalName) || !resolvedSchemas) {
      return false;
    }

    const resolvedSchema = resolvedSchemas[refName.originalName];
    if (!resolvedSchema || !isSchemaObject(resolvedSchema)) {
      return false;
    }

    return isStringLikeDiscriminatorSchema(
      resolvedSchema,
      resolvedSchemas,
      new Set(seenRefs).add(refName.originalName),
    );
  }

  if (Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((type) => type !== "null");
    return (
      nonNullTypes.length > 0 && nonNullTypes.every((type) => type === "string")
    );
  }

  return schema.type === undefined || schema.type === "string";
}

function renderDiscriminatedUnion(
  discriminatorProperty: string,
  memberCodes: string[],
): string {
  return `z.discriminatedUnion("${discriminatorProperty}", [${memberCodes.join(", ")}])`;
}

function renderPlainUnion(memberCodes: string[]): string {
  return `z.union([${memberCodes.join(", ")}])`;
}

function unwrapNullableDiscriminatedUnionMember(
  member: DiscriminatedUnionMember,
  resolvedSchemas?: ResolvedSchemas,
): null | string {
  if (isReferenceObject(member.schema)) {
    const resolvedSchema = resolveReferencedSchema(
      member.schema,
      resolvedSchemas,
    );
    if (!resolvedSchema || resolvedSchema.default !== undefined) {
      return null;
    }
    return `${member.code}.unwrap()`;
  }

  if (member.schema.default !== undefined) {
    return null;
  }

  return stripTopLevelNullableWrapper(member.code);
}

function isDiscriminatedUnionMemberCompatible(
  schema: ReferenceObject | SchemaObject,
  discriminatorProperty: string,
  resolvedSchemas?: ResolvedSchemas,
  seenRefs = new Set<string>(),
  narrowing: DiscriminatorNarrowing = "none",
): boolean {
  if (isReferenceObject(schema)) {
    const refName = parseSchemaReference(schema.$ref);
    if (!refName || seenRefs.has(refName.originalName) || !resolvedSchemas) {
      return true;
    }

    const resolvedSchema = resolvedSchemas[refName.originalName];
    if (!resolvedSchema || !isSchemaObject(resolvedSchema)) {
      return true;
    }

    return isResolvedDiscriminatedUnionMemberCompatible(
      resolvedSchema,
      discriminatorProperty,
      {
        narrowing,
        resolvedSchemas,
        seenRefs: new Set(seenRefs).add(refName.originalName),
      },
    );
  }

  return isResolvedDiscriminatedUnionMemberCompatible(
    schema,
    discriminatorProperty,
    {
      narrowing,
      resolvedSchemas,
      seenRefs,
    },
  );
}

function isResolvedDiscriminatedUnionMemberCompatible(
  schema: SchemaObject,
  discriminatorProperty: string,
  options: ResolvedDiscriminatedUnionMemberCompatibilityOptions = {},
): boolean {
  const {
    narrowing = "none",
    resolvedSchemas,
    seenRefs = new Set<string>(),
  } = options;

  if (
    !isObjectLikeDiscriminatedUnionMember(schema, resolvedSchemas, seenRefs)
  ) {
    return false;
  }

  /*
   * A narrowing plan already proved the discriminator is present and
   * non-static, so only object-likeness matters for .extend() to work.
   */
  if (isNarrowed(narrowing)) {
    return true;
  }

  const discriminatorSchema = findDiscriminatorProperty(
    schema,
    discriminatorProperty,
    resolvedSchemas,
    seenRefs,
  );
  if (!discriminatorSchema) {
    return false;
  }

  return isStaticDiscriminatorSchema(
    discriminatorSchema,
    resolvedSchemas,
    seenRefs,
  );
}

function isDiscriminatedUnionMemberNullable(
  schema: ReferenceObject | SchemaObject,
  resolvedSchemas?: ResolvedSchemas,
): boolean {
  if (isReferenceObject(schema)) {
    const resolvedSchema = resolveReferencedSchema(schema, resolvedSchemas);
    return resolvedSchema ? isSchemaNullable(resolvedSchema) : false;
  }

  return isSchemaNullable(schema);
}

function isSchemaNullable(schema: SchemaObject): boolean {
  return isNullable(schema)
    ? true
    : Array.isArray(schema.type) && schema.type.includes("null");
}

function resolveReferencedSchema(
  schema: ReferenceObject,
  resolvedSchemas?: ResolvedSchemas,
): null | SchemaObject {
  if (!resolvedSchemas) {
    return null;
  }

  const refName = parseSchemaReference(schema.$ref);
  if (!refName) {
    return null;
  }

  const resolvedSchema = resolvedSchemas[refName.originalName];
  return resolvedSchema && isSchemaObject(resolvedSchema)
    ? resolvedSchema
    : null;
}

function isObjectLikeDiscriminatedUnionMember(
  schema: SchemaObject,
  resolvedSchemas?: ResolvedSchemas,
  seenRefs = new Set<string>(),
): boolean {
  if (schema.anyOf || schema.oneOf) {
    return false;
  }

  if (schema.enum || schema.const !== undefined) {
    return false;
  }

  /*
   * allOf compositions are object-like when all members resolve to objects.
   * This handles discriminator inheritance patterns where a derived schema
   * uses allOf to extend a base with a more specific discriminator value.
   */
  if (schema.allOf) {
    return schema.allOf.every((member) => {
      if (isReferenceObject(member)) {
        if (!resolvedSchemas) return true;
        const refName = parseSchemaReference(member.$ref);
        if (!refName) return true;
        if (seenRefs.has(refName.originalName)) return true;
        const resolved = resolvedSchemas[refName.originalName];
        if (!resolved || !isSchemaObject(resolved)) return true;
        return isObjectLikeDiscriminatedUnionMember(
          resolved,
          resolvedSchemas,
          new Set(seenRefs).add(refName.originalName),
        );
      }
      return isObjectLikeDiscriminatedUnionMember(
        member,
        resolvedSchemas,
        seenRefs,
      );
    });
  }

  if (Array.isArray(schema.type)) {
    const nonNullTypes = schema.type.filter((type) => type !== "null");
    return nonNullTypes.length === 1 && nonNullTypes[0] === "object";
  }

  return !schema.type || schema.type === "object";
}

function isStaticDiscriminatorSchema(
  schema: ReferenceObject | SchemaObject,
  resolvedSchemas?: ResolvedSchemas,
  seenRefs = new Set<string>(),
): boolean {
  if (isReferenceObject(schema)) {
    const refName = parseSchemaReference(schema.$ref);
    if (!refName || seenRefs.has(refName.originalName) || !resolvedSchemas) {
      return true;
    }

    const resolvedSchema = resolvedSchemas[refName.originalName];
    if (!resolvedSchema || !isSchemaObject(resolvedSchema)) {
      return true;
    }

    return isStaticDiscriminatorSchema(
      resolvedSchema,
      resolvedSchemas,
      new Set(seenRefs).add(refName.originalName),
    );
  }

  return schema.const !== undefined || Boolean(schema.enum?.length);
}

/*
 * Walk through an allOf chain to find the discriminator property schema,
 * preferring the most specific (deepest/last) definition.
 * For plain objects, returns the property directly.
 */
function findDiscriminatorProperty(
  schema: SchemaObject,
  propertyName: string,
  resolvedSchemas?: ResolvedSchemas,
  seenRefs = new Set<string>(),
): ReferenceObject | SchemaObject | undefined {
  if (schema.properties?.[propertyName]) {
    return schema.properties[propertyName];
  }

  if (!schema.allOf) {
    return undefined;
  }

  /*
   * Scan allOf members in reverse order to prefer the most specific
   * (derived) discriminator value over the base schema's definition.
   */
  for (let i = schema.allOf.length - 1; i >= 0; i--) {
    const member = schema.allOf[i];
    let resolvedMember: SchemaObject | undefined;

    if (isReferenceObject(member)) {
      if (!resolvedSchemas) continue;
      const refName = parseSchemaReference(member.$ref);
      if (!refName) continue;
      if (seenRefs.has(refName.originalName)) continue;
      const resolved = resolvedSchemas[refName.originalName];
      if (!resolved || !isSchemaObject(resolved)) continue;
      resolvedMember = resolved;
      const found = findDiscriminatorProperty(
        resolvedMember,
        propertyName,
        resolvedSchemas,
        new Set(seenRefs).add(refName.originalName),
      );
      if (found) return found;
      continue;
    } else {
      resolvedMember = member;
    }

    const found = findDiscriminatorProperty(
      resolvedMember,
      propertyName,
      resolvedSchemas,
      seenRefs,
    );
    if (found) return found;
  }

  return undefined;
}

/*
 * Collect the mapping keys whose target resolves to the given member ref.
 * Handles pointer, multi-file, and bare schema-name mapping values by comparing
 * schema names. Several keys may point at the same schema (e.g. aliases), so
 * all are returned.
 */
function findMappingKeys(ref: string, mapping: DiscriminatorMapping): string[] {
  const refName = parseSchemaReference(ref, { allowExternal: true });
  const keys: string[] = [];

  for (const [key, mappingRef] of Object.entries(mapping)) {
    if (mappingRef === ref) {
      keys.push(key);
      continue;
    }
    if (!refName) continue;

    if (resolveMappingSchemaName(mappingRef) === refName.originalName) {
      keys.push(key);
    }
  }

  return keys;
}

/*
 * OpenAPI allows a mapping value to be either a reference or a bare schema
 * name, so fall back to the value itself when it is not a reference.
 */
function resolveMappingSchemaName(mappingRef: string): string | undefined {
  const parsed = parseSchemaReference(mappingRef, { allowExternal: true });
  if (parsed) {
    return parsed.originalName;
  }

  return mappingRef.includes("/") || mappingRef.includes("#")
    ? undefined
    : mappingRef;
}

function stripTopLevelNullableWrapper(code: string): null | string {
  const nullableWrapper = ".nullable()";
  const nullableIndex = findTopLevelNullableWrapper(code, nullableWrapper);
  if (nullableIndex === null) {
    return null;
  }

  const codeBeforeNullable = stripEnclosingParens(code.slice(0, nullableIndex));
  const codeAfterNullable = code.slice(nullableIndex + nullableWrapper.length);
  return `${codeBeforeNullable}${codeAfterNullable}`;
}

function findTopLevelNullableWrapper(
  code: string,
  wrapper: string,
): null | number {
  let bracketDepth = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let quote: '"' | "'" | "`" | undefined;
  let escaped = false;
  let matchIndex: null | number = null;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") {
      parenDepth++;
      continue;
    }
    if (char === ")") {
      parenDepth--;
      continue;
    }
    if (char === "{") {
      braceDepth++;
      continue;
    }
    if (char === "}") {
      braceDepth--;
      continue;
    }
    if (char === "[") {
      bracketDepth++;
      continue;
    }
    if (char === "]") {
      bracketDepth--;
      continue;
    }
    if (
      char === "." &&
      bracketDepth === 0 &&
      braceDepth === 0 &&
      parenDepth === 0 &&
      code.startsWith(wrapper, i)
    ) {
      matchIndex = i;
      i += wrapper.length - 1;
    }
  }

  return matchIndex;
}

function stripEnclosingParens(code: string): string {
  if (!code.startsWith("(") || !code.endsWith(")")) {
    return code;
  }

  let parenDepth = 0;
  let quote: '"' | "'" | "`" | undefined;
  let escaped = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") {
      parenDepth++;
      continue;
    }
    if (char === ")") {
      parenDepth--;
      if (parenDepth === 0 && i < code.length - 1) {
        return code;
      }
    }
  }

  return code.slice(1, -1);
}
