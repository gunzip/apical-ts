import { z } from 'zod';
import { MessageSubject } from "./MessageSubject.js";
import { MessageBodyMarkdown } from "./MessageBodyMarkdown.js";

export const MessageContent = z.object({"subject": MessageSubject.optional(), "markdown": MessageBodyMarkdown});
export type MessageContent = z.infer<typeof MessageContent>;