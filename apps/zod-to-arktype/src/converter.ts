/*
 * Zod to ArkType Schema Converter
 *
 * This module converts Zod v4 schema definitions to ArkType schemas.
 * It handles various Zod patterns including objects, unions, arrays, and primitives.
 */

/**
 * Result of converting a Zod schema to ArkType
 */
export interface ConversionResult {
  code: string;
  imports: Set<string>;
  schemaName: string;
}

/**
 * Converts a Zod schema code string to ArkType schema code
 */
export function convertZodToArkType(
  zodCode: string,
  schemaName: string,
): ConversionResult {
  try {
    /* Remove leading/trailing whitespace */
    const trimmedCode = zodCode.trim();

    /* Handle empty input */
    if (!trimmedCode) {
      return {
        code: 'type("unknown")',
        imports: new Set<string>(),
        schemaName,
      };
    }

    /* Convert the schema definition */
    const arktypeCode = convertToType(trimmedCode);

    /* Extract imports from the original code */
    const imports = extractImports(zodCode);

    return {
      code: arktypeCode,
      imports,
      schemaName,
    };
  } catch (error) {
    throw new Error(
      `Failed to convert schema ${schemaName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Converts allOf pattern (object with spread shapes) to ArkType intersection
 */
function convertAllOfObject(zodExpr: string): string {
  /* Extract all spread shape references */
  const shapeRefs: string[] = [];
  const shapePattern = /\.\.\.([A-Za-z0-9_]+)\.shape/g;
  let match;

  while ((match = shapePattern.exec(zodExpr)) !== null) {
    shapeRefs.push(match[1]);
  }

  /* Also extract inline properties if any */
  const inlinePropsMatch = zodExpr.match(/\{([^.}]+):/);
  const hasInlineProps =
    inlinePropsMatch && !inlinePropsMatch[1].includes("...");

  if (shapeRefs.length === 0) {
    return "type({})";
  }

  /* Create intersection of all shapes */
  if (shapeRefs.length === 1 && !hasInlineProps) {
    return shapeRefs[0];
  }

  // Chain intersections using .and()
  let expr = shapeRefs[0];
  for (let i = 1; i < shapeRefs.length; i++) {
    expr = `(${expr}).and(${shapeRefs[i]})`;
  }
  return expr;
}

/**
 * Converts z.array() to ArkType array Type expression
 */
function convertArray(zodExpr: string): string {
  /* Extract array element type from z.array(...) */
  const match = zodExpr.match(/z\.array\((.+)\)/);
  if (!match) {
    return 'type("unknown").array()';
  }

  const elementType = convertToType(match[1].trim());
  return `(${elementType}).array()`;
}

/**
 * Converts z.discriminatedUnion() to ArkType discriminated union
 */
function convertDiscriminatedUnion(zodExpr: string): string {
  /* Extract discriminator and members */
  const match = zodExpr.match(
    /z\.discriminatedUnion\("([^"]+)",\s*\[([^\]]+)\]\)/,
  );
  if (!match) {
    return 'type("unknown")';
  }

  const members = match[2].split(",").map((m) => m.trim());

  /* ArkType doesn't have discriminatedUnion, use regular union via .or() */
  const convertedMembers = members.map((m) => convertToType(m));
  if (convertedMembers.length === 0) return 'type("unknown")';
  let expr = convertedMembers[0];
  for (let i = 1; i < convertedMembers.length; i++) {
    expr = `(${expr}).or(${convertedMembers[i]})`;
  }
  return expr;
}

/**
 * Converts z.enum() to ArkType enum
 */
function convertEnum(zodExpr: string): string {
  const match = zodExpr.match(/z\.enum\(\[([^\]]+)\]\)/);
  if (!match) {
    return 'type("unknown")';
  }

  const values = match[1].split(",").map((v) => v.trim());
  return `type.enumerated(${values.join(", ")})`;
}

/**
 * Converts z.intersection() to ArkType intersection via .and()
 */
function convertIntersection(zodExpr: string): string {
  /* Extract intersection members */
  const match = zodExpr.match(/z\.intersection\(([^,]+),\s*(.+)\)/);
  if (!match) {
    return 'type("unknown")';
  }

  const left = convertToType(match[1].trim());
  const right = convertToType(match[2].trim());

  return `(${left}).and(${right})`;
}

/**
 * Converts z.literal() to ArkType enumerated literal
 */
function convertLiteral(zodExpr: string): string {
  const match = zodExpr.match(/z\.literal\((.+)\)/);
  if (!match) {
    return 'type("unknown")';
  }

  return `type.enumerated(${match[1]})`;
}

/**
 * Helper: detect optional() chain
 */
function isOptional(zodExpr: string): boolean {
  return /\.optional\(\)/.test(zodExpr);
}

function stripOptional(zodExpr: string): string {
  return zodExpr.replace(/\.optional\(\)/g, "");
}

/**
 * Converts z.object() to ArkType object definition using type({...})
 */
function convertObject(zodExpr: string): string {
  /* Extract the object shape from z.object({...}) */
  const shapeMatch = zodExpr.match(/z\.object\((\{[\s\S]*?\})\)/);
  if (!shapeMatch) {
    return "type({})";
  }

  const shape = shapeMatch[1];

  /* Check for allOf pattern with shape spreading */
  if (shape.includes("...") && shape.includes(".shape")) {
    return convertAllOfObject(zodExpr);
  }

  /* Parse object properties */
  const properties = parseObjectProperties(shape);
  const convertedProps = properties.map(({ key, value }) => {
    const opt = isOptional(value);
    const clean = stripOptional(value);
    const convertedValue = convertToPropertyValue(clean);
    // use key-embedded optional syntax which requires quoted key
    const outKey = opt ? JSON.stringify(`${key}?`) : key;
    return `${outKey}: ${convertedValue}`;
  });

  return `type({${convertedProps.join(", ")}})`;
}

/**
 * Converts z.string() with modifiers to ArkType type() expression (top-level)
 */
function convertStringToType(zodExpr: string): string {
  const optional = isOptional(zodExpr);
  const base = stripOptional(zodExpr);
  let expr = "string";
  if (base.includes(".email()")) expr = "string.email";
  else if (base.includes(".url()")) expr = "string.url";
  else if (base.includes(".uuid()")) expr = "string.uuid";

  const typeExpr = `type("${expr}")`;
  if (optional) return `(${typeExpr}).or(type("undefined"))`;
  return typeExpr;
}

/**
 * Converts z.union() to ArkType union using .or()
 */
function convertUnion(zodExpr: string): string {
  /* Extract union members from z.union([...]) */
  const match = zodExpr.match(/z\.union\(\[([^\]]+)\]\)/);
  if (!match) {
    return 'type("unknown")';
  }

  const members = match[1].split(",").map((m) => m.trim());
  const convertedMembers = members.map((m) => convertToType(m));
  if (convertedMembers.length === 0) return 'type("unknown")';
  let expr = convertedMembers[0];
  for (let i = 1; i < convertedMembers.length; i++) {
    expr = `(${expr}).or(${convertedMembers[i]})`;
  }
  return expr;
}

/**
 * Converts a Zod expression to an ArkType Type expression (usable at top-level or in chaining)
 */
function convertToType(zodExpr: string): string {
  /* Handle z.object() */
  if (zodExpr.startsWith("z.object(")) {
    return convertObject(zodExpr);
  }

  /* Handle z.union() */
  if (zodExpr.startsWith("z.union(")) {
    return convertUnion(zodExpr);
  }

  /* Handle z.discriminatedUnion() */
  if (zodExpr.startsWith("z.discriminatedUnion(")) {
    return convertDiscriminatedUnion(zodExpr);
  }

  /* Handle z.intersection() */
  if (zodExpr.startsWith("z.intersection(")) {
    return convertIntersection(zodExpr);
  }

  /* Handle z.array() */
  if (zodExpr.startsWith("z.array(")) {
    return convertArray(zodExpr);
  }

  /* Handle primitive types */
  if (zodExpr.startsWith("z.string(")) {
    return convertStringToType(zodExpr);
  }

  if (zodExpr.startsWith("z.number(")) {
    const optional = isOptional(zodExpr);
    const base = stripOptional(zodExpr);
    const isInt = base.includes(".int()");
    const inner = isInt ? 'type("number.integer")' : 'type("number")';
    return optional ? `(${inner}).or(type("undefined"))` : inner;
  }

  if (zodExpr.startsWith("z.boolean(")) {
    return 'type("boolean")';
  }

  if (zodExpr.startsWith("z.literal(")) {
    return convertLiteral(zodExpr);
  }

  if (zodExpr.startsWith("z.enum(")) {
    return convertEnum(zodExpr);
  }

  if (zodExpr === "z.unknown()") {
    return 'type("unknown")';
  }

  if (zodExpr === "z.any()") {
    return 'type("unknown")';
  }

  if (zodExpr === "z.null()") {
    return 'type("null")';
  }

  if (zodExpr === "z.undefined()") {
    return 'type("undefined")';
  }

  /* If it's a reference to another schema, return as-is */
  if (!zodExpr.includes("z.")) {
    return zodExpr;
  }

  /* Fallback to unknown for unhandled cases */
  return 'type("unknown")';
}

/**
 * Extracts import statements from schema code
 */
function extractImports(code: string): Set<string> {
  const imports = new Set<string>();
  const importPattern = /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g;
  let match;

  while ((match = importPattern.exec(code)) !== null) {
    const importedNames = match[1].split(",").map((name) => name.trim());
    importedNames.forEach((name) => imports.add(name));
  }

  return imports;
}

/**
 * Parses object properties from a shape string
 */
function parseObjectProperties(
  shape: string,
): { key: string; value: string }[] {
  const properties: { key: string; value: string }[] = [];

  /* Remove outer braces */
  const content = shape.slice(1, -1).trim();
  if (!content) {
    return properties;
  }

  /* Split by commas at the top level */
  let depth = 0;
  let currentKey = "";
  let currentValue = "";
  let inKey = true;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (char === "{" || char === "[" || char === "(") {
      depth++;
    } else if (char === "}" || char === "]" || char === ")") {
      depth--;
    }

    if (depth === 0 && char === ":" && inKey) {
      inKey = false;
      i++;
      continue;
    }

    if (depth === 0 && char === "," && !inKey) {
      properties.push({
        key: currentKey.trim().replace(/["']/g, ""),
        value: currentValue.trim(),
      });
      currentKey = "";
      currentValue = "";
      inKey = true;
      i++;
      continue;
    }

    if (inKey) {
      currentKey += char;
    } else {
      currentValue += char;
    }

    i++;
  }

  /* Add the last property */
  if (currentKey || currentValue) {
    properties.push({
      key: currentKey.trim().replace(/["']/g, ""),
      value: currentValue.trim(),
    });
  }

  return properties;
}

/**
 * Converts a Zod expression to an ArkType definition usable as an object property value
 */
function convertToPropertyValue(zodExpr: string): string {
  // Object values may be string expressions (e.g., "string.email"), Types (e.g., Message),
  // or definitions like SomeType.optional

  // Nested arrays/objects/unions become Type expressions via convertToType
  if (
    zodExpr.startsWith("z.object(") ||
    zodExpr.startsWith("z.union(") ||
    zodExpr.startsWith("z.discriminatedUnion(") ||
    zodExpr.startsWith("z.intersection(") ||
    zodExpr.startsWith("z.array(") ||
    zodExpr.startsWith("z.enum(") ||
    zodExpr.startsWith("z.literal(")
  ) {
    return convertToType(zodExpr);
  }

  if (zodExpr.startsWith("z.string(")) {
    // map modifiers to string expression
    const base = stripOptional(zodExpr);
    if (base.includes(".email()")) return '"string.email"';
    if (base.includes(".url()")) return '"string.url"';
    if (base.includes(".uuid()")) return '"string.uuid"';
    return '"string"';
  }

  if (zodExpr.startsWith("z.number(")) {
    const base = stripOptional(zodExpr);
    if (base.includes(".int()")) return '"number.integer"';
    return '"number"';
  }

  if (zodExpr.startsWith("z.boolean(")) {
    return '"boolean"';
  }

  if (zodExpr === "z.unknown()") return '"unknown"';
  if (zodExpr === "z.null()") return '"null"';
  if (zodExpr === "z.undefined()") return '"undefined"';

  // If it's a reference to another schema, return as-is
  if (!zodExpr.includes("z.")) {
    return zodExpr;
  }

  // Fallback
  return 'type("unknown")';
}
