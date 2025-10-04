import { z } from "zod";
import { CustomStringFormatTest } from "./CustomStringFormatTest.js";

/* Parameter schemas for type-safe inputs */
const testParamWithSchemaRefQuerySchema = z.object({});
const testParamWithSchemaRefPathSchema = z.object({ "param": CustomStringFormatTest });
const testParamWithSchemaRefHeadersSchema = z.object({});

/* Export schemas for external use */
export { testParamWithSchemaRefQuerySchema };
export { testParamWithSchemaRefPathSchema };
export { testParamWithSchemaRefHeadersSchema };

/* Export types for external use */
export type testParamWithSchemaRefQuerySchema = z.infer<typeof testParamWithSchemaRefQuerySchema>;
export type testParamWithSchemaRefPathSchema = z.infer<typeof testParamWithSchemaRefPathSchema>;
export type testParamWithSchemaRefHeadersSchema = z.infer<typeof testParamWithSchemaRefHeadersSchema>;
