import { z } from 'zod';

export const Person = z.object({"name": z.string().optional(), "address": z.object({"location": z.string().optional(), "city": z.string().optional(), "zipCode": z.string().regex(new RegExp("^\\d{5}$")).optional()}).optional()});
export type Person = z.infer<typeof Person>;