import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testResponseRefWithInlineSchemaQuerySchema = z.object({});
const testResponseRefWithInlineSchemaPathSchema = z.object({});
const testResponseRefWithInlineSchemaHeadersSchema = z.object({});

/* Export schemas for external use */
export { testResponseRefWithInlineSchemaQuerySchema };
export { testResponseRefWithInlineSchemaPathSchema };
export { testResponseRefWithInlineSchemaHeadersSchema };

/* Export types for external use */
export type testResponseRefWithInlineSchemaQuerySchema = z.infer<typeof testResponseRefWithInlineSchemaQuerySchema>;
export type testResponseRefWithInlineSchemaPathSchema = z.infer<typeof testResponseRefWithInlineSchemaPathSchema>;
export type testResponseRefWithInlineSchemaHeadersSchema = z.infer<typeof testResponseRefWithInlineSchemaHeadersSchema>;
