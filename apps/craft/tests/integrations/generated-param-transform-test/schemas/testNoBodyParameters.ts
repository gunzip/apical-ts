import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testNoBodyQuerySchema = z.object({});
const testNoBodyPathSchema = z.object({});
const testNoBodyHeadersSchema = z.object({});

/* Export schemas for external use */
export { testNoBodyQuerySchema };
export { testNoBodyPathSchema };
export { testNoBodyHeadersSchema };

/* Export types for external use */
export type testNoBodyQuerySchema = z.infer<typeof testNoBodyQuerySchema>;
export type testNoBodyPathSchema = z.infer<typeof testNoBodyPathSchema>;
export type testNoBodyHeadersSchema = z.infer<typeof testNoBodyHeadersSchema>;
