import { z } from 'zod';

/**
 * True if the recipient of a message wants to forward the notifications to the default webhook.
 */
export const IsWebhookEnabled = z.boolean().default(false).default(false);
export type IsWebhookEnabled = z.infer<typeof IsWebhookEnabled>;