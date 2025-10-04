import { z } from 'zod';

export const InlinePropertyTest = z.object({"inlineProp": z.string().regex(new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")).optional()});
export type InlinePropertyTest = z.infer<typeof InlinePropertyTest>;