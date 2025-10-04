import { z } from 'zod';

export const ConstantIntegerTest = z.literal(100);
export type ConstantIntegerTest = z.infer<typeof ConstantIntegerTest>;