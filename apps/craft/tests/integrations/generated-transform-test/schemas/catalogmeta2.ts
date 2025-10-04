import { z } from 'zod';

export const catalogmeta2 = z.strictObject({"url": z.url(), "name": z.string().regex(new RegExp("^[a-zA-Z0-9]+$")).default("").optional(), "description": z.string().default("").optional()});
export type catalogmeta2 = z.infer<typeof catalogmeta2>;