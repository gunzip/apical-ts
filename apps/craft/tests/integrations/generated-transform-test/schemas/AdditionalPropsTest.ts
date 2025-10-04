import { z } from 'zod';

export const AdditionalPropsTest = z.object({}).catchall(z.array(z.number()));
export type AdditionalPropsTest = z.infer<typeof AdditionalPropsTest>;