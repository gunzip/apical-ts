import { z } from 'zod';

export const EnumTest = z.object({"status": z.enum(["value1", "value2", "value3"]).optional()});
export type EnumTest = z.infer<typeof EnumTest>;