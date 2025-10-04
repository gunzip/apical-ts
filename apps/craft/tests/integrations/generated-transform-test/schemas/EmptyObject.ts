import { z } from 'zod';

export const EmptyObject = z.object({"attributes": z.object({"properties": z.object({}).catchall(z.unknown())})});
export type EmptyObject = z.infer<typeof EmptyObject>;