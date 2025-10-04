import { z } from 'zod';

export const DashedBodyTest = z.object({"id-field": z.string(), "nested-dash": z.object({"child-prop": z.string().optional()}).optional()});
export type DashedBodyTest = z.infer<typeof DashedBodyTest>;