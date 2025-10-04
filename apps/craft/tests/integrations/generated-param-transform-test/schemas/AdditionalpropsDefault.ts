import { z } from 'zod';

export const AdditionalpropsDefault = z.object({}).catchall(z.array(z.number())).default({"test":[1000]}).default({"test":[1000]});
export type AdditionalpropsDefault = z.infer<typeof AdditionalpropsDefault>;