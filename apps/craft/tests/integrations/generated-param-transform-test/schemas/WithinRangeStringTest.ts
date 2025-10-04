import { z } from 'zod';

export const WithinRangeStringTest = z.string().min(8).max(10);
export type WithinRangeStringTest = z.infer<typeof WithinRangeStringTest>;