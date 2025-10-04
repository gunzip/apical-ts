import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testParameterWithDashAnUnderscoreQuerySchema = z.object({ "foo_bar": z.string().optional(), "request-id": z.string().min(10).optional() });
const testParameterWithDashAnUnderscorePathSchema = z.object({ "path-param": z.string() });
const testParameterWithDashAnUnderscoreHeadersSchema = z.object({ "header-InlineParam": z.string(), "x-header-param": z.string() });

/* Export schemas for external use */
export { testParameterWithDashAnUnderscoreQuerySchema };
export { testParameterWithDashAnUnderscorePathSchema };
export { testParameterWithDashAnUnderscoreHeadersSchema };

/* Export types for external use */
export type testParameterWithDashAnUnderscoreQuerySchema = z.infer<typeof testParameterWithDashAnUnderscoreQuerySchema>;
export type testParameterWithDashAnUnderscorePathSchema = z.infer<typeof testParameterWithDashAnUnderscorePathSchema>;
export type testParameterWithDashAnUnderscoreHeadersSchema = z.infer<typeof testParameterWithDashAnUnderscoreHeadersSchema>;
