import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testResponseHeaderQuerySchema = z.object({});
const testResponseHeaderPathSchema = z.object({});
const testResponseHeaderHeadersSchema = z.object({});

/* Export schemas for external use */
export { testResponseHeaderQuerySchema };
export { testResponseHeaderPathSchema };
export { testResponseHeaderHeadersSchema };

/* Export types for external use */
export type testResponseHeaderQuerySchema = z.infer<typeof testResponseHeaderQuerySchema>;
export type testResponseHeaderPathSchema = z.infer<typeof testResponseHeaderPathSchema>;
export type testResponseHeaderHeadersSchema = z.infer<typeof testResponseHeaderHeadersSchema>;
