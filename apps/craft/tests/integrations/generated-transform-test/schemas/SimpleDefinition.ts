import { z } from 'zod';

export const SimpleDefinition = z.object({"id": z.string()}).default({"id":"default-id"});
export type SimpleDefinition = z.infer<typeof SimpleDefinition>;