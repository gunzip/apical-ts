import { z } from 'zod';

export const WithinRangeIntegerTest = z.number().min(0).max(10).int();
export type WithinRangeIntegerTest = z.infer<typeof WithinRangeIntegerTest>;