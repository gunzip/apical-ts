import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testParameterWithBodyReferenceQuerySchema = z.object({});
const testParameterWithBodyReferencePathSchema = z.object({});
const testParameterWithBodyReferenceHeadersSchema = z.object({});

/* Export schemas for external use */
export { testParameterWithBodyReferenceQuerySchema };
export { testParameterWithBodyReferencePathSchema };
export { testParameterWithBodyReferenceHeadersSchema };

/* Export types for external use */
export type testParameterWithBodyReferenceQuerySchema = z.infer<typeof testParameterWithBodyReferenceQuerySchema>;
export type testParameterWithBodyReferencePathSchema = z.infer<typeof testParameterWithBodyReferencePathSchema>;
export type testParameterWithBodyReferenceHeadersSchema = z.infer<typeof testParameterWithBodyReferenceHeadersSchema>;
