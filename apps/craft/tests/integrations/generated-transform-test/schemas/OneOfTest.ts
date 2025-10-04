import { z } from 'zod';

export const OneOfTest = z.union([z.object({"limited": z.boolean().optional()}), z.object({"unlimited": z.boolean().optional()})]).superRefine((x, ctx) => {
  const schemas = [z.object({"limited": z.boolean().optional()}), z.object({"unlimited": z.boolean().optional()})];
  const errors = schemas.reduce<z.ZodError[]>(
    (errors, schema) =>
      ((result) => (result.error ? [...errors, result.error] : errors))(
        schema.safeParse(x),
      ),
    [],
  );
  if (schemas.length - errors.length !== 1) {
    ctx.addIssue({
      code: "invalid_union",
      errors: errors.map(error => error.issues),
      message: "Invalid input: Should pass exactly one schema",
    });
  }
});
export type OneOfTest = z.infer<typeof OneOfTest>;