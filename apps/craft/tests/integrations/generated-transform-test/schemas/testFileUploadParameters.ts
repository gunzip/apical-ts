import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testFileUploadQuerySchema = z.object({});
const testFileUploadPathSchema = z.object({});
const testFileUploadHeadersSchema = z.object({});

/* Export schemas for external use */
export { testFileUploadQuerySchema };
export { testFileUploadPathSchema };
export { testFileUploadHeadersSchema };

/* Export types for external use */
export type testFileUploadQuerySchema = z.infer<typeof testFileUploadQuerySchema>;
export type testFileUploadPathSchema = z.infer<typeof testFileUploadPathSchema>;
export type testFileUploadHeadersSchema = z.infer<typeof testFileUploadHeadersSchema>;
