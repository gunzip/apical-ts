import { z } from 'zod';

/**
 * The full version of the message, in plain text or Markdown format. The
 * content of this field will be delivered to channels that don't have any
 * limit in terms of content size (e.g. email, etc...).
 */
export const MessageBodyMarkdown = z.string().min(80).max(10000);
export type MessageBodyMarkdown = z.infer<typeof MessageBodyMarkdown>;