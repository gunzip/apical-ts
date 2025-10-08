/*
 * Zod to ArkType Schema Converter (fold-based)
 *
 * Implements a structured conversion using @traversable/zod's zx.fold and zx.tagged.
 * Regex-based transformations have been removed to keep the logic predictable and simple.
 */

import { zx } from "@traversable/zod";
import * as z from "zod";

/**
 * Result of converting a Zod schema to ArkType
 */
export interface ConversionResult {
  code: string;
  imports: Set<string>;
  schemaName: string;
}

/**
 * Public API: convert a Zod schema instance to ArkType code string.
 * If a non-Zod value is passed, returns type("unknown").
 */
export function convertZodToArkType(
  zodSchema: unknown,
  schemaName: string,
): ConversionResult {
  try {
    if (!isZodSchema(zodSchema)) {
      return { code: 'type("unknown")', imports: new Set(), schemaName };
    }

    // Track referenced identifiers encountered during fold
    const usedRefs = new Set<string>();

    // eslint-disable-next-line complexity
    const toArkType = zx.fold<string>((x, _i, schema) => {
      const ref = refIdentifierFromZod(schema);
      if (ref) {
        usedRefs.add(ref);
        return ref;
      }
      switch (true) {
        case zx.tagged("never")(x):
          return 'type("never")';
        case zx.tagged("unknown")(x): {
          const r = refIdentifierFromZod(schema) ?? refIdentifierFromZod(x);
          if (r) usedRefs.add(r);
          return r ?? 'type("unknown")';
        }
        case zx.tagged("any")(x): {
          const r = refIdentifierFromZod(schema) ?? refIdentifierFromZod(x);
          if (r) usedRefs.add(r);
          return r ?? 'type("unknown")';
        }
        case zx.tagged("void")(x):
          return 'type("unknown")';
        case zx.tagged("null")(x):
          return 'type("null")';
        case zx.tagged("undefined")(x):
          return 'type("undefined")';
        case zx.tagged("boolean")(x):
          return 'type("boolean")';
        case zx.tagged("int")(x):
          return mapZodNumberToArk(x, true);
        case zx.tagged("number")(x):
          return mapZodNumberToArk(x, false);
        case zx.tagged("string")(x):
          return mapZodStringToArk(x);
        case zx.tagged("literal")(x):
          return mapZodLiteralToArk(x);
        case zx.tagged("enum")(x):
          return mapZodEnumToArk(x);
        case zx.tagged("union")(x): {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opts = (x as any)._zod.def.options as readonly string[];
          return joinWithBinary(opts, ".or");
        }
        case zx.tagged("intersection")(x): {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const left: string = (x as any)._zod.def.left;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const right: string = (x as any)._zod.def.right;
          return `(${left}).and(${right})`;
        }
        case zx.tagged("array")(x): {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const item: string = (x as any)._zod.def.element;
          return `(${item}).array()`;
        }
        case zx.tagged("tuple")(x): {
          // Keep it simple: represent tuples as array of anyOf items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items: string[] = (x as any)._zod.def.items ?? [];
          if (items.length === 0) return '(type("unknown")).array()';
          // Approximate: union all items as element type
          const union = joinWithBinary(items, ".or");
          return `(${union}).array()`;
        }
        case zx.tagged("optional")(x): {
          // Return the inner type; optionality is handled in object properties
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inner: string = (x as any)._zod.def.innerType;
          return inner;
        }
        case zx.tagged("nullable")(x): {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inner: string = (x as any)._zod.def.innerType;
          return `(${inner}).or(type("null"))`;
        }
        case zx.tagged("object")(x): {
          // x._zod.def.shape contains the folded property values
          // To detect optional keys and references, inspect the original (unfolded) schema
          const original = schema as z.ZodTypeAny;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const shape: Record<string, string> = (x as any)._zod.def.shape;
          // Extract original Zod object shape from _def.shape() or _def.shape
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const o: any = original as any;
          const originalShape: Record<string, z.ZodTypeAny> | undefined =
            typeof o?._def?.shape === "function"
              ? // shape() returns ZodRawShape
                (o._def.shape() as Record<string, z.ZodTypeAny>)
              : o?._def?.shape;
          const parts: string[] = [];

          for (const [key, val] of Object.entries(shape)) {
            const rawChild = originalShape ? originalShape[key] : undefined;
            // Detect optional, unwrapping to inner type for reference detection
            const isOpt =
              !!rawChild &&
              (rawChild instanceof z.ZodOptional ||
                zx.tagged("optional")(rawChild));
            // Determine output key: quote when optional (to carry '?') or when not a valid identifier
            let outKey: string;
            if (isOpt) {
              outKey = JSON.stringify(`${key}?`);
            } else {
              const isValidIdent = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
              outKey = isValidIdent ? key : JSON.stringify(key);
            }
            // Prefer recomputing from original child to preserve references
            const computed = rawChild ? toArkType(rawChild) : val;
            const propVal = toPropertyValue(computed);
            parts.push(`${outKey}: ${propVal}`);
          }

          return `type({${parts.join(", ")}})`;
        }
        default: {
          return 'type("unknown")';
        }
      }
    });

    const arktypeCode = toArkType(zodSchema);
    return { code: arktypeCode, imports: usedRefs, schemaName };
  } catch (error) {
    throw new Error(
      `Failed to convert schema ${schemaName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Check if a node was explicitly created with .int() */
function hasExplicitInt(node: unknown): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zxnode = node as any;
    // Check if there's an int check in the original checks
    const checks: unknown =
      zxnode?._zod?._def?.checks ??
      zxnode?._zod?.def?.checks ??
      zxnode?._def?.checks ??
      [];
    const arr: Record<string, unknown>[] = Array.isArray(checks)
      ? (checks as Record<string, unknown>[])
      : [];

    return arr.some((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const check = c as any;
      return check?.kind === "int";
    });
  } catch {
    return false;
  }
}

function isZodSchema(input: unknown): input is z.ZodTypeAny {
  return !!input && input instanceof z.ZodType;
}

/** Utility: join binary expressions left .op right .op ... */
function joinWithBinary(items: readonly string[], op: ".and" | ".or"): string {
  if (items.length === 0) return 'type("unknown")';
  let out = items[0];
  for (let i = 1; i < items.length; i++) out = `(${out})${op}(${items[i]})`;
  return out;
}

/** Map ZodEnum to ArkType enumerated */
function mapZodEnumToArk(x: unknown): string {
  const values = Array.from(
    (x as { _zod?: { values?: Iterable<string> } })?._zod?.values ?? [],
  );
  const vals = values.map((v) => JSON.stringify(v)).join(", ");
  return `type.enumerated(${vals})`;
}

/** Map ZodLiteral to ArkType enumerated */
function mapZodLiteralToArk(x: unknown): string {
  const def =
    (x as { _zod?: { def?: { value?: unknown; values?: unknown[] } } })?._zod
      ?.def ?? {};
  if (Array.isArray((def as { values?: unknown[] }).values)) {
    const vals = (def as { values: unknown[] }).values
      .map((v) => JSON.stringify(v))
      .join(", ");
    return `type.enumerated(${vals})`;
  }
  return `type.enumerated(${JSON.stringify((def as { value?: unknown }).value)})`;
}

/** Map ZodNumber/ZodInt to ArkType with constraints */
function mapZodNumberToArk(node: unknown, isInteger: boolean): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zxnode = node as any;

    // Get bag data from @traversable/zod which contains parsed constraint info
    const bag = zxnode?._zod?.bag ?? {};

    const constraints: string[] = [];

    // Extract constraints from bag (preferred) - order: max, min, gt, lt, multipleOf
    if (typeof bag.maximum === "number") {
      // Filter out extreme values that are likely auto-added by .int()
      if (Math.abs(bag.maximum) < 9007199254740991) {
        constraints.push(`max(${bag.maximum})`);
      }
    }
    if (typeof bag.minimum === "number") {
      // Filter out extreme values that are likely auto-added by .int()
      if (Math.abs(bag.minimum) < 9007199254740991) {
        constraints.push(`min(${bag.minimum})`);
      }
    }
    if (typeof bag.exclusiveMaximum === "number") {
      constraints.push(`lt(${bag.exclusiveMaximum})`);
    }
    if (typeof bag.exclusiveMinimum === "number") {
      constraints.push(`gt(${bag.exclusiveMinimum})`);
    }
    if (typeof bag.multipleOf === "number") {
      constraints.push(`multipleOf(${bag.multipleOf})`);
    }

    // Build base type
    const baseType = isInteger ? "number.integer" : "number";
    // For multipleOf, check if this was explicitly an integer or implicitly due to multipleOf
    let actualBaseType = baseType;
    if (
      isInteger &&
      typeof bag.multipleOf === "number" &&
      !hasExplicitInt(node)
    ) {
      // This is likely a multipleOf that was auto-detected as int, use number instead
      actualBaseType = "number";
    }

    // Combine with constraints
    if (constraints.length > 0) {
      return `type("${actualBaseType}.${constraints.join(".")}")`;
    }

    return `type("${actualBaseType}")`;
  } catch {
    // Fallback on error
    return isInteger ? 'type("number.integer")' : 'type("number")';
  }
}

/** Map ZodString checks into ArkType flavors when possible */
// eslint-disable-next-line complexity
function mapZodStringToArk(node: unknown): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zxnode = node as any;

    // Get bag data from @traversable/zod which contains parsed constraint info
    const bag = zxnode?._zod?.bag ?? {};

    // Try wrapper -> raw order for checks
    const checks: unknown =
      zxnode?._zod?._def?.checks ??
      zxnode?._zod?.def?.checks ??
      zxnode?._def?.checks ??
      [];
    const arr: Record<string, unknown>[] = Array.isArray(checks)
      ? (checks as Record<string, unknown>[])
      : [];

    // Track format constraints (email, url, uuid take precedence)
    let baseFormat: null | string = null;
    const constraints: string[] = [];

    // Check for format constraints from checks first
    for (const check of arr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = check as any;

      if (c?.kind === "email" || c?.format === "email") {
        baseFormat = "string.email";
        continue;
      }
      if (c?.kind === "url" || c?.format === "url") {
        baseFormat = "string.url";
        continue;
      }
      if (c?.kind === "uuid" || c?.format === "uuid") {
        baseFormat = "string.uuid";
        continue;
      }
    }

    // Extract constraints from bag (preferred) - order: max, min, regex
    if (typeof bag.maximum === "number") {
      constraints.push(`max(${bag.maximum})`);
    }
    if (typeof bag.minimum === "number") {
      constraints.push(`min(${bag.minimum})`);
    }

    // Also check pattern for regex, but filter out format-specific and generic patterns
    const pattern = zxnode?._zod?.pattern;
    if (pattern instanceof RegExp) {
      const patternStr = pattern.toString();
      constraints.push(`regex(${patternStr})`);
    }

    // Build result
    const base = baseFormat || "string";
    if (constraints.length > 0) {
      return `type("${base}.${constraints.join(".")}")`;
    }

    return `type("${base}")`;
  } catch {
    // ignore and fall back to plain string
  }
  return 'type("string")';
}

/** Convert a top-level ArkType expression to a property value where possible */
/** Detect reference placeholders (z.any().describe("ref:Name")) and map to bare identifier */
function refIdentifierFromZod(node: unknown): null | string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v: any = node;
    const description: unknown =
      v?.description ??
      v?._def?.description ??
      v?._zod?.description ??
      v?._zod?._def?.description ??
      v?._zod?.def?.description;
    if (typeof description === "string" && description.startsWith("ref:")) {
      const name = description.slice(4).trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return name;
    }
    return null;
  } catch {
    return null;
  }
}

function toPropertyValue(code: string): string {
  // convert type("string") -> "string"; same for number, boolean, number.integer, string.email/url/uuid
  const m = code.match(/^type\("([^"]+)"\)$/);
  if (m) return JSON.stringify(m[1]);
  // pass-through for reference identifiers e.g. Address, User
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(code)) return code;
  return code;
}
