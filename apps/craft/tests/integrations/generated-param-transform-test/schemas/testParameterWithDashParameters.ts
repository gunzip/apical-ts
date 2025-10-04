import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testParameterWithDashQuerySchema = z.object({ "foo-bar": z.string().optional(), "request-id": z.string().min(10).optional() });
const testParameterWithDashPathSchema = z.object({ "path-param": z.string().min(5) });
const testParameterWithDashHeadersSchema = z.object({ "headerInlineParam": z.string(), "x-header-param": z.string() });

/* Export schemas for external use */
export { testParameterWithDashQuerySchema };
export { testParameterWithDashPathSchema };
export { testParameterWithDashHeadersSchema };

/* Export types for external use */
export type testParameterWithDashQuerySchema = z.infer<typeof testParameterWithDashQuerySchema>;
export type testParameterWithDashPathSchema = z.infer<typeof testParameterWithDashPathSchema>;
export type testParameterWithDashHeadersSchema = z.infer<typeof testParameterWithDashHeadersSchema>;
