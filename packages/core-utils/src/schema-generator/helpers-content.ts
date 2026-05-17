/*
 * Central registry for generated schema helpers. The helper key is what schema
 * generation tracks in result.helpers; the importName and implementation are
 * then derived from this single source of truth.
 */
const GENERATED_SCHEMA_HELPERS = {
  exclusiveUnion: {
    implementation: `
/*
 * Validates that exactly one schema in the union matches the input.
 * Provides oneOf (exclusive union) semantics on top of z.union.
 */
export function exclusiveUnion<T extends [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]>(schemas: T) {
  return z.union(schemas).superRefine((x, ctx) => {
    const errors: z.ZodError[] = [];
    for (const schema of schemas) {
      const result = schema.safeParse(x);
      if (result.error) {
        errors.push(result.error);
      }
    }
    if (schemas.length - errors.length !== 1) {
      ctx.addIssue({
        code: "invalid_union",
        errors: errors.map(error => error.issues),
        message: "Invalid input: Should pass exactly one schema",
      });
    }
  });
}
`,
    importName: "exclusiveUnion",
  },
} as const;

export type GeneratedSchemaHelper = keyof typeof GENERATED_SCHEMA_HELPERS;

export function buildGeneratedSchemaHelpersImport(
  helpers: Iterable<GeneratedSchemaHelper>,
): string {
  const helperImports = Array.from(new Set(helpers))
    .map((helper) => GENERATED_SCHEMA_HELPERS[helper].importName)
    .sort();

  if (helperImports.length === 0) {
    return "";
  }

  return `import { ${helperImports.join(", ")} } from "./runtime.ts";\n`;
}

export function getHelpersFileContent(): string {
  const helperImplementations = Object.values(GENERATED_SCHEMA_HELPERS)
    .map(({ implementation }) => implementation.trim())
    .join("\n\n");

  return `import * as z from 'zod';\n\n${helperImplementations}\n`;
}

export const HELPERS_FILE_NAME = "runtime.ts";
