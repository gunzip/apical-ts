import { z } from 'zod';

export const BlobSchema = z.object({"id": z.string().optional()});
export type BlobSchema = z.infer<typeof BlobSchema>;