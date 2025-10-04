import { z } from 'zod';

/**
 * Pagination response parameters.
 */
export const PaginationResponse = z.object({"page_size": z.number().min(1).int().optional(), "next": z.url().optional()});
export type PaginationResponse = z.infer<typeof PaginationResponse>;