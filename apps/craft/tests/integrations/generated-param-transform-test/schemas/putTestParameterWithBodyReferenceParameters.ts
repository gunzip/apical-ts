import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const putTestParameterWithBodyReferenceQuerySchema = z.object({});
const putTestParameterWithBodyReferencePathSchema = z.object({});
const putTestParameterWithBodyReferenceHeadersSchema = z.object({});

/* Export schemas for external use */
export { putTestParameterWithBodyReferenceQuerySchema };
export { putTestParameterWithBodyReferencePathSchema };
export { putTestParameterWithBodyReferenceHeadersSchema };

/* Export types for external use */
export type putTestParameterWithBodyReferenceQuerySchema = z.infer<typeof putTestParameterWithBodyReferenceQuerySchema>;
export type putTestParameterWithBodyReferencePathSchema = z.infer<typeof putTestParameterWithBodyReferencePathSchema>;
export type putTestParameterWithBodyReferenceHeadersSchema = z.infer<typeof putTestParameterWithBodyReferenceHeadersSchema>;
