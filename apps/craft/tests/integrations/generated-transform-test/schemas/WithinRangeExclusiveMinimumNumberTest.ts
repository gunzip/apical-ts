import { z } from 'zod';

export const WithinRangeExclusiveMinimumNumberTest = z.number().max(10).gt(0);
export type WithinRangeExclusiveMinimumNumberTest = z.infer<typeof WithinRangeExclusiveMinimumNumberTest>;