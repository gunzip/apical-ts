import { z } from 'zod';

export const AdditionalPropsTrueTest = z.object({}).catchall(z.unknown());
export type AdditionalPropsTrueTest = z.infer<typeof AdditionalPropsTrueTest>;