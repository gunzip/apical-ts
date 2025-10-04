import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testWithEmptyResponseQuerySchema = z.object({});
const testWithEmptyResponsePathSchema = z.object({});
const testWithEmptyResponseHeadersSchema = z.object({});

/* Export schemas for external use */
export { testWithEmptyResponseQuerySchema };
export { testWithEmptyResponsePathSchema };
export { testWithEmptyResponseHeadersSchema };

/* Export types for external use */
export type testWithEmptyResponseQuerySchema = z.infer<typeof testWithEmptyResponseQuerySchema>;
export type testWithEmptyResponsePathSchema = z.infer<typeof testWithEmptyResponsePathSchema>;
export type testWithEmptyResponseHeadersSchema = z.infer<typeof testWithEmptyResponseHeadersSchema>;
