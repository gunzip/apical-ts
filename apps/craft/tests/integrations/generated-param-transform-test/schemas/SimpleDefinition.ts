import { z } from 'zod';

export const SimpleDefinition = z.object({"id": z.string()});
export type SimpleDefinition = z.infer<typeof SimpleDefinition>;