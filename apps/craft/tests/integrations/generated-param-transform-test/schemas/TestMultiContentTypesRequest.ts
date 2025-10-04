import { z } from 'zod';

/**
 * Request schema for testMultiContentTypes operation
 */
export const TestMultiContentTypesRequest = z.object({"id": z.string(), "name": z.string()});
export type TestMultiContentTypesRequest = z.infer<typeof TestMultiContentTypesRequest>;