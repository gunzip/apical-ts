import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testInlineBodySchemaQuerySchema = z.object({});
const testInlineBodySchemaPathSchema = z.object({});
const testInlineBodySchemaHeadersSchema = z.object({});

/* Export schemas for external use */
export { testInlineBodySchemaQuerySchema };
export { testInlineBodySchemaPathSchema };
export { testInlineBodySchemaHeadersSchema };

/* Export types for external use */
export type testInlineBodySchemaQuerySchema = z.infer<typeof testInlineBodySchemaQuerySchema>;
export type testInlineBodySchemaPathSchema = z.infer<typeof testInlineBodySchemaPathSchema>;
export type testInlineBodySchemaHeadersSchema = z.infer<typeof testInlineBodySchemaHeadersSchema>;
