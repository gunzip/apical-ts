import { z } from 'zod';

export const CustomStringFormatTest = z.string();
export type CustomStringFormatTest = z.infer<typeof CustomStringFormatTest>;