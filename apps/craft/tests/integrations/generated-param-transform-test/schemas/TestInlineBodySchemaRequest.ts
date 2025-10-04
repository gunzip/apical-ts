import { z } from 'zod';

/**
 * Request schema for testInlineBodySchema operation
 */
export const TestInlineBodySchemaRequest = z.object({"name": z.string(), "age": z.number().optional()});
export type TestInlineBodySchemaRequest = z.infer<typeof TestInlineBodySchemaRequest>;