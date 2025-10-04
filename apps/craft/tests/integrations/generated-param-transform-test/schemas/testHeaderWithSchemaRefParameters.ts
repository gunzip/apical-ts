import { z } from "zod";
import { CustomStringFormatTest } from "./CustomStringFormatTest.js";

/* Parameter schemas for type-safe inputs */
const testHeaderWithSchemaRefQuerySchema = z.object({});
const testHeaderWithSchemaRefPathSchema = z.object({});
const testHeaderWithSchemaRefHeadersSchema = z.object({ "param": CustomStringFormatTest });

/* Export schemas for external use */
export { testHeaderWithSchemaRefQuerySchema };
export { testHeaderWithSchemaRefPathSchema };
export { testHeaderWithSchemaRefHeadersSchema };

/* Export types for external use */
export type testHeaderWithSchemaRefQuerySchema = z.infer<typeof testHeaderWithSchemaRefQuerySchema>;
export type testHeaderWithSchemaRefPathSchema = z.infer<typeof testHeaderWithSchemaRefPathSchema>;
export type testHeaderWithSchemaRefHeadersSchema = z.infer<typeof testHeaderWithSchemaRefHeadersSchema>;
