import { z } from 'zod';
import { EnabledUserTest } from "./EnabledUserTest.js";
import { DisabledUserTest } from "./DisabledUserTest.js";

export const DisjointUnionsUserTest = z.union([EnabledUserTest, DisabledUserTest]).superRefine((x, ctx) => {
  const schemas = [EnabledUserTest, DisabledUserTest];
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
export type DisjointUnionsUserTest = z.infer<typeof DisjointUnionsUserTest>;