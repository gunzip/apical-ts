import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testSimplePatchQuerySchema = z.object({});
const testSimplePatchPathSchema = z.object({});
const testSimplePatchHeadersSchema = z.object({});

/* Export schemas for external use */
export { testSimplePatchQuerySchema };
export { testSimplePatchPathSchema };
export { testSimplePatchHeadersSchema };

/* Export types for external use */
export type testSimplePatchQuerySchema = z.infer<typeof testSimplePatchQuerySchema>;
export type testSimplePatchPathSchema = z.infer<typeof testSimplePatchPathSchema>;
export type testSimplePatchHeadersSchema = z.infer<typeof testSimplePatchHeadersSchema>;
