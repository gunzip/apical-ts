import { z } from 'zod';

export const WithinRangeExclusiveMaximumNumberTest = z.number().min(0).lt(10);
export type WithinRangeExclusiveMaximumNumberTest = z.infer<typeof WithinRangeExclusiveMaximumNumberTest>;