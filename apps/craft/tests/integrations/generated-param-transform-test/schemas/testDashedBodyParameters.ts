import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testDashedBodyQuerySchema = z.object({});
const testDashedBodyPathSchema = z.object({});
const testDashedBodyHeadersSchema = z.object({});

/* Export schemas for external use */
export { testDashedBodyQuerySchema };
export { testDashedBodyPathSchema };
export { testDashedBodyHeadersSchema };

/* Export types for external use */
export type testDashedBodyQuerySchema = z.infer<typeof testDashedBodyQuerySchema>;
export type testDashedBodyPathSchema = z.infer<typeof testDashedBodyPathSchema>;
export type testDashedBodyHeadersSchema = z.infer<typeof testDashedBodyHeadersSchema>;
