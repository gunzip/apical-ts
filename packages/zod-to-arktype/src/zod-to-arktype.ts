import type { ConversionResult, ZodArg, ZodCallNode } from "./types.js";

export function convertZodToArktype(node: ZodCallNode): ConversionResult {
  const referencedSchemas = new Set<string>();
  const code = convertNode(node, referencedSchemas);
  /* Safety: never produce empty output — fallback to unknown */
  const safeCode = code || `type("unknown")`;
  return { code: safeCode, needsTypeImport: true, referencedSchemas };
}

function convertNode(node: ZodCallNode, refs: Set<string>): string {
  if (node.kind === "identifier") {
    if (node.name !== "z") {
      refs.add(node.name);
      return node.name;
    }
    return "";
  }

  if (node.kind === "property") {
    const obj = convertNode(node.object, refs);
    if (obj === "" && node.property === "coerce") {
      return "__coerce__";
    }
    return obj;
  }

  if (node.kind !== "call") return "type.any";

  return convertCall(node, refs);
}

function convertCall(
  node: { kind: "call"; method: string; object?: ZodCallNode; args: ZodArg[] },
  refs: Set<string>,
): string {
  const { method, object, args } = node;

  /* Base z.* calls — these create a type from scratch */
  if (isZodRoot(object)) {
    return convertZodFactory(method, args, refs);
  }

  /* Coerce variants (z.coerce.bigint(), etc.) */
  if (isCoerceRoot(object)) {
    return convertCoerceFactory(method, args, refs);
  }

  /* Namespace variants (z.iso.datetime(), etc.) */
  const ns = getZodNamespace(object);
  if (ns) {
    return convertNamespaceFactory(ns, method, args, refs);
  }

  /* Chained refinement methods applied to an existing type */
  if (object) {
    const base = convertNode(object, refs);
    return applyRefinement(base, method, args, refs);
  }

  /* Standalone identifier call (e.g., calling a referenced schema as fn) */
  return `type("unknown")`;
}

function isZodRoot(node: ZodCallNode | undefined): boolean {
  if (!node) return false;
  if (node.kind === "identifier" && node.name === "z") return true;
  return false;
}

function isCoerceRoot(node: ZodCallNode | undefined): boolean {
  if (!node) return false;
  if (node.kind === "property" && node.property === "coerce") return true;
  if (node.kind === "identifier" && node.name === "__coerce__") return true;
  return false;
}

/* Detects z.iso, z.string (when used as namespace), etc. */
function getZodNamespace(node: ZodCallNode | undefined): string | null {
  if (!node) return null;
  if (
    node.kind === "property" &&
    node.object.kind === "identifier" &&
    node.object.name === "z"
  ) {
    return node.property;
  }
  return null;
}

function convertZodFactory(
  method: string,
  args: ZodArg[],
  refs: Set<string>,
): string {
  switch (method) {
    case "string":
      return `type("string")`;
    case "number":
      return `type("number")`;
    case "boolean":
      return `type("boolean")`;
    case "bigint":
      return `type("bigint")`;
    case "unknown":
      return `type("unknown")`;
    case "any":
      return `type("unknown")`;
    case "never":
      return `type("never")`;
    case "null":
      return `type("null")`;
    case "undefined":
      return `type("undefined")`;
    case "void":
      return `type("undefined")`;

    case "literal":
      return convertLiteral(args);

    case "enum":
      return convertEnum(args);

    case "object":
      return convertObject(args, refs, "passthrough");
    case "strictObject":
      return convertObject(args, refs, "reject");

    case "array":
      return convertArray(args, refs);

    case "union":
      return convertUnion(args, refs);
    case "discriminatedUnion":
      return convertDiscriminatedUnion(args, refs);

    case "lazy":
      return convertLazy(args, refs);

    case "record":
      return convertRecord(args, refs);

    case "tuple":
      return convertTuple(args, refs);

    default:
      return `type("unknown") /* unsupported: z.${method}() */`;
  }
}

function convertCoerceFactory(
  method: string,
  _args: ZodArg[],
  _refs: Set<string>,
): string {
  switch (method) {
    case "bigint":
      return `type("bigint") /* note: coercion not available in arktype */`;
    case "number":
      return `type("number") /* note: coercion not available in arktype */`;
    case "string":
      return `type("string") /* note: coercion not available in arktype */`;
    case "boolean":
      return `type("boolean") /* note: coercion not available in arktype */`;
    default:
      return `type("unknown") /* unsupported: z.coerce.${method}() */`;
  }
}

function convertNamespaceFactory(
  namespace: string,
  method: string,
  _args: ZodArg[],
  _refs: Set<string>,
): string {
  if (namespace === "iso") {
    switch (method) {
      case "datetime":
        return `type("string.date.iso")`;
      case "date":
        return `type("string.date")`;
      case "time":
        return `type("string")`;
      default:
        return `type("string") /* unsupported: z.iso.${method}() */`;
    }
  }
  return `type("unknown") /* unsupported: z.${namespace}.${method}() */`;
}

function convertLiteral(args: ZodArg[]): string {
  if (args.length === 0) return `type("unknown")`;
  const arg = args[0];
  switch (arg.kind) {
    case "string":
      return `type("'${escapeArkString(arg.value)}'")`;
    case "number":
      return `type("${arg.value}")`;
    case "boolean":
      return `type("${arg.value}")`;
    case "null":
      return `type("null")`;
    default:
      return `type("unknown") /* unsupported literal */`;
  }
}

function convertEnum(args: ZodArg[]): string {
  if (args.length === 0) return `type("unknown")`;
  const arg = args[0];
  if (arg.kind !== "array") return `type("unknown")`;

  const values = arg.elements
    .map((el) => {
      if (el.kind === "string") return `'${escapeArkString(el.value)}'`;
      if (el.kind === "number") return `${el.value}`;
      return null;
    })
    .filter(Boolean);

  if (values.length === 0) return `type("never")`;
  if (values.length === 1) return `type("${values[0]}")`;
  return `type("${values.join(" | ")}")`;
}

function convertObject(
  args: ZodArg[],
  refs: Set<string>,
  undeclaredMode: "passthrough" | "reject",
): string {
  if (args.length === 0) return `type({})`;
  const arg = args[0];

  /* Handle spread pattern: z.object({...Schema.shape}) → reference Schema directly */
  if (arg.kind === "spread") {
    if (arg.node.kind === "identifier") {
      refs.add(arg.node.name);
      return arg.node.name;
    }
    return `type({})`;
  }

  if (arg.kind !== "object") return `type({})`;

  const entries = arg.properties.map((prop) => {
    const { key, isOptional, arkValue } = convertObjectProperty(
      prop.key,
      prop.value,
      refs,
    );
    const quotedKey = isOptional ? `"${key}?"` : `"${key}"`;
    return `${quotedKey}: ${arkValue}`;
  });

  if (undeclaredMode === "reject") {
    entries.push(`"+": "reject"`);
  }

  return `type({${entries.length > 0 ? " " + entries.join(", ") + " " : ""}})`;
}

function convertObjectProperty(
  key: string,
  valueNode: ZodCallNode,
  refs: Set<string>,
): { key: string; isOptional: boolean; arkValue: string } {
  const { baseNode, isOptional, isNullable, defaultValue } =
    unwrapModifiers(valueNode);
  let arkValue = convertNodeToInline(baseNode, refs);

  if (isNullable) {
    arkValue = wrapNullable(arkValue);
  }

  if (defaultValue !== undefined) {
    return {
      key,
      isOptional: true,
      arkValue: `[${arkValue}, "=", ${defaultValue}]`,
    };
  }

  return { key, isOptional, arkValue };
}

function unwrapModifiers(node: ZodCallNode): {
  baseNode: ZodCallNode;
  isOptional: boolean;
  isNullable: boolean;
  defaultValue: string | undefined;
} {
  let isOptional = false;
  let isNullable = false;
  let defaultValue: string | undefined;
  let current = node;

  while (current.kind === "call") {
    if (current.method === "optional" && current.object) {
      isOptional = true;
      current = current.object;
      continue;
    }
    if (current.method === "nullable" && current.object) {
      isNullable = true;
      current = current.object;
      continue;
    }
    if (
      current.method === "default" &&
      current.object &&
      current.args.length > 0
    ) {
      isOptional = true;
      defaultValue = argToLiteral(current.args[0]);
      current = current.object;
      continue;
    }
    if (current.method === "describe" && current.object) {
      current = current.object;
      continue;
    }
    break;
  }

  return { baseNode: current, isOptional, isNullable, defaultValue };
}

function convertNodeToInline(node: ZodCallNode, refs: Set<string>): string {
  const full = convertNode(node, refs);

  /* Safety: never produce empty output */
  if (!full) return `"unknown"`;

  /* Extract the inner definition from type("...") if it's a simple type() call */
  const match = full.match(/^type\("(.+)"\)$/);
  if (match) return `"${match[1]}"`;

  /* For complex expressions (objects, arrays), return as-is for embedding */
  return full;
}

function wrapNullable(arkValue: string): string {
  if (arkValue.startsWith('"') && arkValue.endsWith('"')) {
    const inner = arkValue.slice(1, -1);
    return `"${inner} | null"`;
  }
  return arkValue;
}

function convertArray(args: ZodArg[], refs: Set<string>): string {
  if (args.length === 0) return `type("unknown[]")`;
  const arg = args[0];
  const itemType = argToNode(arg);
  if (!itemType) return `type("unknown[]")`;

  const inner = convertNodeToInline(itemType, refs);
  if (inner.startsWith('"') && inner.endsWith('"')) {
    const innerType = inner.slice(1, -1);
    if (isSimpleType(innerType)) {
      return `type("${innerType}[]")`;
    }
    return `type("(${innerType})[]")`;
  }
  return `type(${inner}, "[]")`;
}

function convertUnion(args: ZodArg[], refs: Set<string>): string {
  if (args.length === 0) return `type("never")`;
  const arg = args[0];
  if (arg.kind !== "array") return `type("unknown")`;

  const members = arg.elements
    .map((el) => {
      const node = argToNode(el);
      if (!node) return null;
      return convertNodeToInline(node, refs);
    })
    .filter(Boolean) as string[];

  const inlineMembers = members.map((m) => {
    if (m.startsWith('"') && m.endsWith('"')) return m.slice(1, -1);
    return null;
  });

  if (inlineMembers.every(Boolean)) {
    return `type("${inlineMembers.join(" | ")}")`;
  }

  /* For complex members, use type.or() - but since members may be identifiers, emit as-is */
  return `type(${members.join(", ")}, "|")`;
}

function convertDiscriminatedUnion(args: ZodArg[], refs: Set<string>): string {
  /* ArkType auto-discriminates unions, so skip the first arg (discriminator key) */
  if (args.length < 2) return `type("never")`;
  const membersArg = args[1];
  if (membersArg.kind !== "array") return `type("unknown")`;

  const members = membersArg.elements
    .map((el) => {
      const node = argToNode(el);
      if (!node) return null;
      return convertNodeToInline(node, refs);
    })
    .filter(Boolean) as string[];

  if (members.every((m) => m.startsWith('"') && m.endsWith('"'))) {
    const inlined = members.map((m) => m.slice(1, -1));
    return `type("${inlined.join(" | ")}")`;
  }

  return `type(${members.join(", ")}, "|")`;
}

function convertLazy(args: ZodArg[], refs: Set<string>): string {
  if (args.length === 0) return `type("unknown")`;
  const arg = args[0];
  if (arg.kind === "arrow") {
    const inner = convertNode(arg.bodyNode, refs);
    /* For lazy references, just return the referenced name */
    if (arg.bodyNode.kind === "identifier") {
      refs.add(arg.bodyNode.name);
      return arg.bodyNode.name;
    }
    return inner;
  }
  return `type("unknown")`;
}

function convertRecord(args: ZodArg[], refs: Set<string>): string {
  if (args.length < 2) {
    return `type({ "[string]": "unknown" })`;
  }
  const valueArg = args[1];
  const valueNode = argToNode(valueArg);
  if (!valueNode) return `type({ "[string]": "unknown" })`;

  const valueType = convertNodeToInline(valueNode, refs);
  return `type({ "[string]": ${valueType} })`;
}

function convertTuple(args: ZodArg[], refs: Set<string>): string {
  if (args.length === 0) return `type([])`;
  const arg = args[0];
  if (arg.kind !== "array") return `type([])`;

  const elements = arg.elements.map((el) => {
    const node = argToNode(el);
    if (!node) return `"unknown"`;
    return convertNodeToInline(node, refs);
  });

  return `type([${elements.join(", ")}])`;
}

function applyRefinement(
  base: string,
  method: string,
  args: ZodArg[],
  refs: Set<string>,
): string {
  switch (method) {
    case "optional":
      return makeOptionalWrapped(base);
    case "nullable":
      return makeNullableWrapped(base);
    case "describe":
      return base;
    case "default":
      return base;

    case "min":
      return applyMinMax(base, ">=", args);
    case "max":
      return applyMinMax(base, "<=", args);
    case "gt":
      return applyMinMax(base, ">", args);
    case "lt":
      return applyMinMax(base, "<", args);
    case "int":
      return refineBaseType(base, "number.integer");
    case "positive":
      return applyMinMax(base, ">", [{ kind: "number", value: 0 }]);
    case "negative":
      return applyMinMax(base, "<", [{ kind: "number", value: 0 }]);
    case "nonnegative":
      return applyMinMax(base, ">=", [{ kind: "number", value: 0 }]);
    case "nonpositive":
      return applyMinMax(base, "<=", [{ kind: "number", value: 0 }]);

    /* String format methods */
    case "email":
      return refineBaseType(base, "string.email");
    case "url":
      return refineBaseType(base, "string.url");
    case "uuid":
      return refineBaseType(base, "string.uuid");
    case "regex":
      return applyRegex(base, args);
    case "trim":
      return refineBaseType(base, "string.trim");
    case "toLowerCase":
      return refineBaseType(base, "string.lower");
    case "toUpperCase":
      return refineBaseType(base, "string.upper");

    /* Array methods */
    case "array":
      return wrapInArray(base);

    /* Object methods */
    case "catchall":
      return applyCatchall(base, args, refs);
    case "shape":
      return base;

    default:
      return base;
  }
}

function makeOptionalWrapped(base: string): string {
  const inner = extractTypeString(base);
  if (inner) return `type("${inner} | undefined")`;
  return base;
}

function makeNullableWrapped(base: string): string {
  const inner = extractTypeString(base);
  if (inner) return `type("${inner} | null")`;
  return base;
}

function applyMinMax(base: string, op: string, args: ZodArg[]): string {
  if (args.length === 0) return base;
  const arg = args[0];
  const value = arg.kind === "number" ? arg.value : 0;

  const inner = extractTypeString(base);
  if (!inner) return base;

  /* If already has a constraint (e.g., "string >= 1" or "number >= 0"), combine */
  const rangeMatch = inner.match(
    /^(\w+(?:\.\w+)*)\s*([<>=!]+)\s*(\S+?)(?:\s*&\s*(.+))?$/,
  );
  if (rangeMatch) {
    const baseType = rangeMatch[1];
    const existing = rangeMatch[4]
      ? `${rangeMatch[1]} ${rangeMatch[2]} ${rangeMatch[3]} & ${rangeMatch[4]}`
      : `${rangeMatch[1]} ${rangeMatch[2]} ${rangeMatch[3]}`;
    return `type("${existing} & ${baseType} ${op} ${value}")`;
  }

  return `type("${inner} ${op} ${value}")`;
}

function refineBaseType(base: string, newType: string): string {
  return `type("${newType}")`;
}

function applyRegex(base: string, args: ZodArg[]): string {
  if (args.length === 0) return base;
  const arg = args[0];
  if (arg.kind === "string") {
    return `type("string").constrain("pattern", /${arg.value}/)`;
  }
  return base;
}

function wrapInArray(base: string): string {
  const inner = extractTypeString(base);
  if (inner) {
    if (isSimpleType(inner)) return `type("${inner}[]")`;
    return `type("(${inner})[]")`;
  }
  return `type(${base}, "[]")`;
}

function applyCatchall(
  base: string,
  args: ZodArg[],
  refs: Set<string>,
): string {
  if (args.length === 0) return base;
  const valueNode = argToNode(args[0]);
  if (!valueNode) return base;

  const valueType = convertNodeToInline(valueNode, refs);

  /* Inject index signature into object type */
  if (base.startsWith("type({") && base.endsWith("})")) {
    const inner = base.slice(6, -2).trim();
    if (inner.length > 0) {
      return `type({ ${inner}, "[string]": ${valueType} })`;
    }
    return `type({ "[string]": ${valueType} })`;
  }
  return base;
}

function extractTypeString(typeExpr: string): string | null {
  const match = typeExpr.match(/^type\("(.+)"\)$/);
  return match ? match[1] : null;
}

function isSimpleType(t: string): boolean {
  return /^[\w.]+$/.test(t);
}

function escapeArkString(s: string): string {
  return s.replace(/'/g, "\\'");
}

function argToLiteral(arg: ZodArg): string | undefined {
  switch (arg.kind) {
    case "string":
      return `"${arg.value}"`;
    case "number":
      return `${arg.value}`;
    case "boolean":
      return `${arg.value}`;
    case "null":
      return "null";
    default:
      return undefined;
  }
}

function argToNode(arg: ZodArg): ZodCallNode | undefined {
  if (arg.kind === "call") return arg.node;
  if (arg.kind === "identifier") return { kind: "identifier", name: arg.name };
  return undefined;
}
