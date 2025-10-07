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

    const arktypeCode = toArkType(zodSchema);
    return { code: arktypeCode, imports: new Set(), schemaName };
  } catch (error) {
    throw new Error(
      `Failed to convert schema ${schemaName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Core fold: maps a Zod schema to an ArkType expression string.
 */
// eslint-disable-next-line complexity
const toArkType = zx.fold<string>((x, _i, schema) => {
  const ref = refIdentifierFromZod(schema);
  if (ref) return ref;
  switch (true) {
    case zx.tagged("never")(x):
      return 'type("never")';
    case zx.tagged("unknown")(x): {
      const r = refIdentifierFromZod(schema) ?? refIdentifierFromZod(x);
      return r ?? 'type("unknown")';
    }
    case zx.tagged("any")(x): {
      const r = refIdentifierFromZod(schema) ?? refIdentifierFromZod(x);
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
      return 'type("number.integer")';
    case zx.tagged("number")(x):
      return 'type("number")';
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
      // If inner is a reference placeholder, keep as raw identifier
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
        const outKey = isOpt ? JSON.stringify(`${key}?`) : key;
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

/** Internal helpers and types (alphabetically sorted) */

// (no-op) previously used InternalObjectNode interface removed as unused

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

/** Map ZodString checks into ArkType flavors when possible */
function mapZodStringToArk(node: unknown): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zxnode = node as any;
    // Try wrapper -> raw order for checks
    const checks: unknown =
      zxnode?._zod?._def?.checks ??
      zxnode?._zod?.def?.checks ??
      zxnode?._def?.checks ??
      [];
    const arr: Record<string, unknown>[] = Array.isArray(checks)
      ? (checks as Record<string, unknown>[])
      : [];
    const has = (k: string): boolean =>
      arr.some((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v: any = c;
        return (
          v?.kind === k ||
          v?.format === k ||
          (typeof v?.def?.format === "string" && v.def.format === k)
        );
      });
    if (has("email")) return 'type("string.email")';
    if (has("url")) return 'type("string.url")';
    if (has("uuid")) return 'type("string.uuid")';
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
