import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testBinaryFileUploadQuerySchema = z.object({});
const testBinaryFileUploadPathSchema = z.object({});
const testBinaryFileUploadHeadersSchema = z.object({});

/* Export schemas for external use */
export { testBinaryFileUploadQuerySchema };
export { testBinaryFileUploadPathSchema };
export { testBinaryFileUploadHeadersSchema };

/* Export types for external use */
export type testBinaryFileUploadQuerySchema = z.infer<typeof testBinaryFileUploadQuerySchema>;
export type testBinaryFileUploadPathSchema = z.infer<typeof testBinaryFileUploadPathSchema>;
export type testBinaryFileUploadHeadersSchema = z.infer<typeof testBinaryFileUploadHeadersSchema>;
