import { z } from 'zod';

export const WithinRangeExclusiveMinimumIntegerTest = z.number().max(10).gt(0).int();
export type WithinRangeExclusiveMinimumIntegerTest = z.infer<typeof WithinRangeExclusiveMinimumIntegerTest>;