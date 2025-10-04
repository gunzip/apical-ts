import { z } from 'zod';
import { Person } from "./Person.js";

export const Book = z.object({"title": z.string().optional(), "author": z.object({"isDead": z.boolean().optional(), "info": Person.optional()}).optional()});
export type Book = z.infer<typeof Book>;