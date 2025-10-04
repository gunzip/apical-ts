import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testBinaryFileDownloadQuerySchema = z.object({});
const testBinaryFileDownloadPathSchema = z.object({});
const testBinaryFileDownloadHeadersSchema = z.object({});

/* Export schemas for external use */
export { testBinaryFileDownloadQuerySchema };
export { testBinaryFileDownloadPathSchema };
export { testBinaryFileDownloadHeadersSchema };

/* Export types for external use */
export type testBinaryFileDownloadQuerySchema = z.infer<typeof testBinaryFileDownloadQuerySchema>;
export type testBinaryFileDownloadPathSchema = z.infer<typeof testBinaryFileDownloadPathSchema>;
export type testBinaryFileDownloadHeadersSchema = z.infer<typeof testBinaryFileDownloadHeadersSchema>;
