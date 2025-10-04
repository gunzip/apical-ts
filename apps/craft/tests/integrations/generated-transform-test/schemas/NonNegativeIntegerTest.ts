import { z } from 'zod';

export const NonNegativeIntegerTest = z.number().min(0).int();
export type NonNegativeIntegerTest = z.infer<typeof NonNegativeIntegerTest>;