import { z } from 'zod';
import { MessageContent } from "./MessageContent.js";

export const Message = z.object({"id": z.string(), "content": MessageContent, "sender_service_id": z.string().optional()});
export type Message = z.infer<typeof Message>;