import { z } from 'zod';

export const ApiResponseSchema = z.object({"value": z.string().optional()});
export type ApiResponseSchema = z.infer<typeof ApiResponseSchema>;