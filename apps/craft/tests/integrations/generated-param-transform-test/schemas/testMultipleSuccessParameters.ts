import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testMultipleSuccessQuerySchema = z.object({});
const testMultipleSuccessPathSchema = z.object({});
const testMultipleSuccessHeadersSchema = z.object({});

/* Export schemas for external use */
export { testMultipleSuccessQuerySchema };
export { testMultipleSuccessPathSchema };
export { testMultipleSuccessHeadersSchema };

/* Export types for external use */
export type testMultipleSuccessQuerySchema = z.infer<typeof testMultipleSuccessQuerySchema>;
export type testMultipleSuccessPathSchema = z.infer<typeof testMultipleSuccessPathSchema>;
export type testMultipleSuccessHeadersSchema = z.infer<typeof testMultipleSuccessHeadersSchema>;
