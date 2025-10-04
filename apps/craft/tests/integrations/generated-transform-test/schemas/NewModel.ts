import { z } from 'zod';

export const NewModel = z.object({"id": z.string(), "name": z.string()});
export type NewModel = z.infer<typeof NewModel>;