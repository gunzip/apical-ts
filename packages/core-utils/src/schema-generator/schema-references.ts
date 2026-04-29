import { sanitizeIdentifier } from "./utils.js";

/**
 * Parsed local schema reference names in both their original and sanitized form.
 */
export interface ParsedSchemaReference {
  identifierName: string;
  originalName: string;
}

/**
 * Parses local schema references used by generated schema code.
 */
export function parseSchemaReference(
  ref: string | undefined,
): ParsedSchemaReference | undefined {
  if (!ref) {
    return undefined;
  }

  const componentMatch = /^#\/components\/schemas\/([^/]+)$/.exec(ref);
  if (componentMatch) {
    return createParsedSchemaReference(componentMatch[1]);
  }

  const shortFormMatch = /^#\/([^/]+)$/.exec(ref);
  if (shortFormMatch) {
    return createParsedSchemaReference(shortFormMatch[1]);
  }

  return undefined;
}

export function getSchemaNameFromReference(
  ref: string | undefined,
): string | undefined {
  return parseSchemaReference(ref)?.identifierName;
}

function createParsedSchemaReference(
  originalName: string,
): ParsedSchemaReference {
  return {
    identifierName: sanitizeIdentifier(originalName),
    originalName,
  };
}
