import { z } from 'zod';

export const catalogmeta = z.object({"url": z.url(), "name": z.string().regex(new RegExp("^[a-zA-Z0-9]+$")).default("").optional(), "description": z.string().default("").optional()});
export type catalogmeta = z.infer<typeof catalogmeta>;