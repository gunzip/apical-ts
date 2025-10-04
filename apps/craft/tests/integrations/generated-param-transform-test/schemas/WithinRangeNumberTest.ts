import { z } from 'zod';

export const WithinRangeNumberTest = z.number().min(0).max(10);
export type WithinRangeNumberTest = z.infer<typeof WithinRangeNumberTest>;