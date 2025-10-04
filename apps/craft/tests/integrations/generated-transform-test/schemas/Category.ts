import { z } from 'zod';

export const Category = z.object({
  "name": z.string().optional(),
  get "subcategories"(): z.ZodOptional<z.ZodArray<typeof Category>> { return z.array(Category).optional(); }
});
export type Category = z.infer<typeof Category>;