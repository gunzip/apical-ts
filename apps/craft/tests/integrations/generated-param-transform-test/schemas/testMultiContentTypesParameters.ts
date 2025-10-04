import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testMultiContentTypesQuerySchema = z.object({});
const testMultiContentTypesPathSchema = z.object({});
const testMultiContentTypesHeadersSchema = z.object({});

/* Export schemas for external use */
export { testMultiContentTypesQuerySchema };
export { testMultiContentTypesPathSchema };
export { testMultiContentTypesHeadersSchema };

/* Export types for external use */
export type testMultiContentTypesQuerySchema = z.infer<typeof testMultiContentTypesQuerySchema>;
export type testMultiContentTypesPathSchema = z.infer<typeof testMultiContentTypesPathSchema>;
export type testMultiContentTypesHeadersSchema = z.infer<typeof testMultiContentTypesHeadersSchema>;
