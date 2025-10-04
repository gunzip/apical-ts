import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testWithTwoParamsQuerySchema = z.object({});
const testWithTwoParamsPathSchema = z.object({ "first-param": z.string(), "second-param": z.string() });
const testWithTwoParamsHeadersSchema = z.object({});

/* Export schemas for external use */
export { testWithTwoParamsQuerySchema };
export { testWithTwoParamsPathSchema };
export { testWithTwoParamsHeadersSchema };

/* Export types for external use */
export type testWithTwoParamsQuerySchema = z.infer<typeof testWithTwoParamsQuerySchema>;
export type testWithTwoParamsPathSchema = z.infer<typeof testWithTwoParamsPathSchema>;
export type testWithTwoParamsHeadersSchema = z.infer<typeof testWithTwoParamsHeadersSchema>;
