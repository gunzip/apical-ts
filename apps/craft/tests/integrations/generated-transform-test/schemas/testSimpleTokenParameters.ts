import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testSimpleTokenQuerySchema = z.object({ "qo": z.string().optional(), "qr": z.string(), "cursor": z.string().optional() });
const testSimpleTokenPathSchema = z.object({});
const testSimpleTokenHeadersSchema = z.object({});

/* Export schemas for external use */
export { testSimpleTokenQuerySchema };
export { testSimpleTokenPathSchema };
export { testSimpleTokenHeadersSchema };

/* Export types for external use */
export type testSimpleTokenQuerySchema = z.infer<typeof testSimpleTokenQuerySchema>;
export type testSimpleTokenPathSchema = z.infer<typeof testSimpleTokenPathSchema>;
export type testSimpleTokenHeadersSchema = z.infer<typeof testSimpleTokenHeadersSchema>;
