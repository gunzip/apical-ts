import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testParameterWithReferenceQuerySchema = z.object({ "request-id": z.string().min(10).optional() });
const testParameterWithReferencePathSchema = z.object({});
const testParameterWithReferenceHeadersSchema = z.object({});

/* Export schemas for external use */
export { testParameterWithReferenceQuerySchema };
export { testParameterWithReferencePathSchema };
export { testParameterWithReferenceHeadersSchema };

/* Export types for external use */
export type testParameterWithReferenceQuerySchema = z.infer<typeof testParameterWithReferenceQuerySchema>;
export type testParameterWithReferencePathSchema = z.infer<typeof testParameterWithReferencePathSchema>;
export type testParameterWithReferenceHeadersSchema = z.infer<typeof testParameterWithReferenceHeadersSchema>;
