import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testParametersAtPathLevelQuerySchema = z.object({ "request-id": z.string(), "cursor": z.string().optional() });
const testParametersAtPathLevelPathSchema = z.object({});
const testParametersAtPathLevelHeadersSchema = z.object({});

/* Export schemas for external use */
export { testParametersAtPathLevelQuerySchema };
export { testParametersAtPathLevelPathSchema };
export { testParametersAtPathLevelHeadersSchema };

/* Export types for external use */
export type testParametersAtPathLevelQuerySchema = z.infer<typeof testParametersAtPathLevelQuerySchema>;
export type testParametersAtPathLevelPathSchema = z.infer<typeof testParametersAtPathLevelPathSchema>;
export type testParametersAtPathLevelHeadersSchema = z.infer<typeof testParametersAtPathLevelHeadersSchema>;
