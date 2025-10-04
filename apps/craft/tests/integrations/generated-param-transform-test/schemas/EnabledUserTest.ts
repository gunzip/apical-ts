import { z } from 'zod';

export const EnabledUserTest = z.object({"description": z.string(), "enabled": z.literal(true), "username": z.string()});
export type EnabledUserTest = z.infer<typeof EnabledUserTest>;