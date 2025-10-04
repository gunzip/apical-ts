import { z } from 'zod';

/**
 * Response schema for TestResponseRefWithInlineSchema200
 */
export const TestResponseRefWithInlineSchema200Response = z.object({"id": z.string(), "name": z.string(), "items": z.array(z.string()).optional()});
export type TestResponseRefWithInlineSchema200Response = z.infer<typeof TestResponseRefWithInlineSchema200Response>;