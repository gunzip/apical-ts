import { z } from 'zod';

export const NestedObjectTest = z.object({"inlineProp": z.string().regex(new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")).optional(), "nestedObject": z.object({"inlineProp": z.string().regex(new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")).optional()}).optional()});
export type NestedObjectTest = z.infer<typeof NestedObjectTest>;