import { z } from 'zod';

export const WithinRangeExclusiveMinMaxIntegerTest = z.number().gt(0).lt(10);
export type WithinRangeExclusiveMinMaxIntegerTest = z.infer<typeof WithinRangeExclusiveMinMaxIntegerTest>;