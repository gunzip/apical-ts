/*
 * Generates the content of the runtime.ts file emitted into the schemas directory.
 * The exclusiveUnion helper validates oneOf (exclusive union) semantics at runtime
 * without duplicating variant schema expressions in the generated output.
 */

const EXCLUSIVE_UNION_HELPER = `import * as z from 'zod';

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
`;

export function getHelpersFileContent(): string {
  return EXCLUSIVE_UNION_HELPER;
}

export const HELPERS_FILE_NAME = "runtime.ts";
