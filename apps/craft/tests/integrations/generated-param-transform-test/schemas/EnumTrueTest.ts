import { z } from 'zod';

export const EnumTrueTest = z.object({"flag": z.literal(true).optional()});
export type EnumTrueTest = z.infer<typeof EnumTrueTest>;