import { z } from "zod";
import { CustomStringFormatTest } from "./CustomStringFormatTest.js";

/* Parameter schemas for type-safe inputs */
const testHeaderOptionalQuerySchema = z.object({});
const testHeaderOptionalPathSchema = z.object({});
const testHeaderOptionalHeadersSchema = z.object({ "param": CustomStringFormatTest.optional() });

/* Export schemas for external use */
export { testHeaderOptionalQuerySchema };
export { testHeaderOptionalPathSchema };
export { testHeaderOptionalHeadersSchema };

/* Export types for external use */
export type testHeaderOptionalQuerySchema = z.infer<typeof testHeaderOptionalQuerySchema>;
export type testHeaderOptionalPathSchema = z.infer<typeof testHeaderOptionalPathSchema>;
export type testHeaderOptionalHeadersSchema = z.infer<typeof testHeaderOptionalHeadersSchema>;
