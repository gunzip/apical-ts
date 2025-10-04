import { z } from 'zod';

export const WithinRangeExclusiveMaximumIntegerTest = z.number().min(0).lt(10).int();
export type WithinRangeExclusiveMaximumIntegerTest = z.infer<typeof WithinRangeExclusiveMaximumIntegerTest>;