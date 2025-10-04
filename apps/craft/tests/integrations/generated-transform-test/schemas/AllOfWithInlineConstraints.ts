import { z } from 'zod';

export const AllOfWithInlineConstraints = z.intersection(z.union([z.email(), z.uuid()]).superRefine((x, ctx) => {
  const schemas = [z.email(), z.uuid()];
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
}), z.string().min(5));
export type AllOfWithInlineConstraints = z.infer<typeof AllOfWithInlineConstraints>;