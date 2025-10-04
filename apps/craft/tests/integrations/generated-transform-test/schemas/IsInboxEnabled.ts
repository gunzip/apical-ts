import { z } from 'zod';

/**
 * True if the recipient of a message wants to store its content for later retrieval.
 */
export const IsInboxEnabled = z.boolean().default(false).default(false);
export type IsInboxEnabled = z.infer<typeof IsInboxEnabled>;