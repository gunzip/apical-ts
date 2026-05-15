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

export function buildDiscriminatedUnionCode(
  options: BuildDiscriminatedUnionCodeOptions,
): string {
  const { discriminatorProperty, mapping, members, resolvedSchemas } = options;
  const memberCodes = members.map((member) => member.code);

  if (
    !members.every((member) =>
      isDiscriminatedUnionMemberCompatible(
        member.schema,
        discriminatorProperty,
        resolvedSchemas,
        undefined,
        mapping,
      ),
    )
  ) {
    return renderPlainUnion(memberCodes);
  }

  const nullableFlags = members.map((member) =>
    isDiscriminatedUnionMemberNullable(member.schema, resolvedSchemas),
  );

  if (!nullableFlags.some(Boolean)) {
    return renderDiscriminatedUnion(discriminatorProperty, memberCodes);
  }

  if (!nullableFlags.every(Boolean)) {
    return renderPlainUnion(memberCodes);
  }

  const unwrappedMemberCodes: string[] = [];
  for (const member of members) {
    const unwrappedMemberCode = unwrapNullableDiscriminatedUnionMember(
      member,
      resolvedSchemas,
    );
    if (unwrappedMemberCode === null) {
      return renderPlainUnion(memberCodes);
    }
    unwrappedMemberCodes.push(unwrappedMemberCode);
  }

  return `${renderDiscriminatedUnion(discriminatorProperty, unwrappedMemberCodes)}.nullable()`;
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
  mapping?: DiscriminatorMapping,
): boolean {
  if (isReferenceObject(schema)) {
    /*
     * If a mapping exists and this ref is listed as a mapping target,
     * we trust the mapping declaration without further schema inspection.
     */
    if (mapping && isMappingTarget(schema.$ref, mapping)) {
      return true;
    }

    const refName = parseSchemaReference(schema.$ref);
    if (!refName || seenRefs.has(refName.originalName) || !resolvedSchemas) {
      return true;
    }

    const resolvedSchema = resolvedSchemas[refName.originalName];
    if (!resolvedSchema || !isSchemaObject(resolvedSchema)) {
      return true;
    }

    return isDiscriminatedUnionMemberCompatible(
      resolvedSchema,
      discriminatorProperty,
      resolvedSchemas,
      new Set(seenRefs).add(refName.originalName),
      mapping,
    );
  }

  if (
    !isObjectLikeDiscriminatedUnionMember(schema, resolvedSchemas, seenRefs)
  ) {
    return false;
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
 * Check whether a $ref appears as a target value in the discriminator mapping.
 * Handles both local and multi-file ref formats by comparing schema names.
 */
function isMappingTarget(ref: string, mapping: DiscriminatorMapping): boolean {
  const refName = parseSchemaReference(ref);
  if (!refName) return false;

  for (const mappingRef of Object.values(mapping)) {
    const mappingRefName = parseSchemaReference(mappingRef);
    if (
      mappingRefName &&
      mappingRefName.originalName === refName.originalName
    ) {
      return true;
    }
    if (mappingRef === ref) {
      return true;
    }
  }
  return false;
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
