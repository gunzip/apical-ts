import { z } from 'zod';

/**
 * RFC 7807 problem details object.
 */
export const ProblemDetails = z.object({"type": z.url().optional(), "title": z.string(), "status": z.number().int(), "detail": z.string().optional(), "instance": z.url().optional()});
export type ProblemDetails = z.infer<typeof ProblemDetails>;