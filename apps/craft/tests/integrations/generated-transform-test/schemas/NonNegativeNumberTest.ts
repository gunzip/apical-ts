import { z } from 'zod';

export const NonNegativeNumberTest = z.number().min(0);
export type NonNegativeNumberTest = z.infer<typeof NonNegativeNumberTest>;