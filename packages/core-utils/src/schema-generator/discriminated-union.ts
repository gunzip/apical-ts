import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import { isReferenceObject, isSchemaObject } from "openapi3-ts/oas31";

import type { ResolvedSchemas } from "./types.js";
import { parseSchemaReference } from "./schema-references.js";
import { isNullable } from "./utils.js";

interface DiscriminatedUnionMember {
  code: string;
  schema: ReferenceObject | SchemaObject;
}

interface BuildDiscriminatedUnionCodeOptions {
  discriminatorProperty: string;
  members: DiscriminatedUnionMember[];
  resolvedSchemas?: ResolvedSchemas;
}

export function buildDiscriminatedUnionCode(
  options: BuildDiscriminatedUnionCodeOptions,
): string {
  const { discriminatorProperty, members, resolvedSchemas } = options;
  const memberCodes = members.map((member) => member.code);
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
