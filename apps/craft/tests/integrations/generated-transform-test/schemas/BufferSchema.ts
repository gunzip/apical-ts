import { z } from 'zod';

export const BufferSchema = z.object({"size": z.number().int().optional()});
export type BufferSchema = z.infer<typeof BufferSchema>;