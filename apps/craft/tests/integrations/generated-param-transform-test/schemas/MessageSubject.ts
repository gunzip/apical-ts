import { z } from 'zod';

/**
 * The (optional) subject of the message - note that only some notification
 * channels support the display of a subject. When a subject is not provided,
 * one gets generated from the client attributes.
 */
export const MessageSubject = z.string().min(10).max(120);
export type MessageSubject = z.infer<typeof MessageSubject>;