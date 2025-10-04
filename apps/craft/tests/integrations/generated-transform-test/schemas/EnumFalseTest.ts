import { z } from 'zod';

export const EnumFalseTest = z.object({"flag": z.literal(false).optional()});
export type EnumFalseTest = z.infer<typeof EnumFalseTest>;