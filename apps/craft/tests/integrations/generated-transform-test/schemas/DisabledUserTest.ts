import { z } from 'zod';

export const DisabledUserTest = z.object({"enabled": z.literal(false), "reason": z.string(), "username": z.string()});
export type DisabledUserTest = z.infer<typeof DisabledUserTest>;