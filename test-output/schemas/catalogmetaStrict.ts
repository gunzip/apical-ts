import { z } from 'zod';

export const catalogmetaStrict = z.strictObject({"url": z.url(), "name": z.string().regex(new RegExp("^[a-zA-Z0-9]+$")).default("").optional(), "description": z.string().default("").optional()});
export type catalogmetaStrict = z.infer<typeof catalogmetaStrict>;