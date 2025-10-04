import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testOctetStreamUploadQuerySchema = z.object({});
const testOctetStreamUploadPathSchema = z.object({});
const testOctetStreamUploadHeadersSchema = z.object({});

/* Export schemas for external use */
export { testOctetStreamUploadQuerySchema };
export { testOctetStreamUploadPathSchema };
export { testOctetStreamUploadHeadersSchema };

/* Export types for external use */
export type testOctetStreamUploadQuerySchema = z.infer<typeof testOctetStreamUploadQuerySchema>;
export type testOctetStreamUploadPathSchema = z.infer<typeof testOctetStreamUploadPathSchema>;
export type testOctetStreamUploadHeadersSchema = z.infer<typeof testOctetStreamUploadHeadersSchema>;
