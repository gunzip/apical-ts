import { sanitizeIdentifier } from "./utils.js";

/**
 * Parsed local schema reference names in both their original and sanitized form.
 */
export interface ParsedSchemaReference {
  identifierName: string;
  originalName: string;
}

interface ParseSchemaReferenceOptions {
  allowExternal?: boolean;
}

/**
 * Parses local schema references used by generated schema code.
 * External refs remain unsupported by default so callers can preserve the
 * existing fallback paths for unresolved imports and unknown schemas. Pass
 * allowExternal when you only need to extract the schema name from an
 * external ref fragment for comparisons such as discriminator.mapping.
 */
export function parseSchemaReference(
  ref: string | undefined,
  options: ParseSchemaReferenceOptions = {},
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

  if (!options.allowExternal) {
    return undefined;
  }

  /*
   * Multi-file refs: extract the schema name from the fragment portion.
   * Examples: ./models.yaml#/components/schemas/Dog -> Dog
   *           ../shared/types.yaml#/Foo -> Foo
   */
  const externalRefMatch = /^[^#]+#\/components\/schemas\/([^/]+)$/.exec(ref);
  if (externalRefMatch) {
    return createParsedSchemaReference(externalRefMatch[1]);
  }

  const externalShortFormMatch = /^[^#]+#\/([^/]+)$/.exec(ref);
  if (externalShortFormMatch) {
    return createParsedSchemaReference(externalShortFormMatch[1]);
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
