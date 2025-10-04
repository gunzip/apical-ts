import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testCustomTokenHeaderQuerySchema = z.object({});
const testCustomTokenHeaderPathSchema = z.object({});
const testCustomTokenHeaderHeadersSchema = z.object({});

/* Export schemas for external use */
export { testCustomTokenHeaderQuerySchema };
export { testCustomTokenHeaderPathSchema };
export { testCustomTokenHeaderHeadersSchema };

/* Export types for external use */
export type testCustomTokenHeaderQuerySchema = z.infer<typeof testCustomTokenHeaderQuerySchema>;
export type testCustomTokenHeaderPathSchema = z.infer<typeof testCustomTokenHeaderPathSchema>;
export type testCustomTokenHeaderHeadersSchema = z.infer<typeof testCustomTokenHeaderHeadersSchema>;
