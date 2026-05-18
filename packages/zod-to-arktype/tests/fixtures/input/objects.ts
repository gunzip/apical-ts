import * as z from "zod";

export const Address = z.strictObject({
  street: z.string(),
  city: z.string(),
  zip: z.string().min(5).max(10),
  country: z.string().optional(),
});
export type Address = z.infer<typeof Address>;

export const Person = z.object({
  name: z.string(),
  age: z.number().int().optional(),
  email: z.string().email().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.object({}).catchall(z.string()).optional(),
});
export type Person = z.infer<typeof Person>;
