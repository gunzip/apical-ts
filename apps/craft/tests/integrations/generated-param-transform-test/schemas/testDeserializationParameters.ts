import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testDeserializationQuerySchema = z.object({});
const testDeserializationPathSchema = z.object({});
const testDeserializationHeadersSchema = z.object({});

/* Export schemas for external use */
export { testDeserializationQuerySchema };
export { testDeserializationPathSchema };
export { testDeserializationHeadersSchema };

/* Export types for external use */
export type testDeserializationQuerySchema = z.infer<typeof testDeserializationQuerySchema>;
export type testDeserializationPathSchema = z.infer<typeof testDeserializationPathSchema>;
export type testDeserializationHeadersSchema = z.infer<typeof testDeserializationHeadersSchema>;
