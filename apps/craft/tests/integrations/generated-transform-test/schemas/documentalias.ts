import { z } from 'zod';

export const documentalias = z.object({"id": z.string(), "title": z.string(), "createdAt": z.iso.datetime({ offset: true, local: true })});
export type documentalias = z.infer<typeof documentalias>;