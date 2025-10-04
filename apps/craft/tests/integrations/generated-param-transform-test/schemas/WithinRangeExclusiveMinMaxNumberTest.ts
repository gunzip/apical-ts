import { z } from 'zod';

export const WithinRangeExclusiveMinMaxNumberTest = z.number().gt(0).lt(10);
export type WithinRangeExclusiveMinMaxNumberTest = z.infer<typeof WithinRangeExclusiveMinMaxNumberTest>;