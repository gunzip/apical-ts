/**
 * JavaScript/TypeScript reserved keywords
 *
 * This set contains all reserved keywords that cannot be used as identifiers
 * in JavaScript/TypeScript. Used across the codebase to ensure generated
 * variable names and identifiers don't conflict with language keywords.
 */
export const RESERVED_KEYWORDS = new Set([
  "abstract",
  "any",
  "as",
  "async",
  "await",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "constructor",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "is",
  "let",
  "module",
  "namespace",
  "never",
  "new",
  "null",
  "number",
  "object",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "require",
  "return",
  "set",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "unique",
  "unknown",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

/**
 * Adds underscore suffix if the input is a reserved keyword
 */
export function handleReservedKeyword(input: string): string {
  return isReservedKeyword(input) ? input + "_" : input;
}

/**
 * Check if a string is a reserved keyword
 */
export function isReservedKeyword(str: string): boolean {
  return RESERVED_KEYWORDS.has(str.toLowerCase());
}
