import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testCoercionQuerySchema = z.object({ "num-query": z.number(), "class": z.boolean() });
const testCoercionPathSchema = z.object({ "class": z.number().int(), "bool-param": z.boolean() });
const testCoercionHeadersSchema = z.object({ "count-header": z.number().int() });

/* Export schemas for external use */
export { testCoercionQuerySchema };
export { testCoercionPathSchema };
export { testCoercionHeadersSchema };

/* Export types for external use */
export type testCoercionQuerySchema = z.infer<typeof testCoercionQuerySchema>;
export type testCoercionPathSchema = z.infer<typeof testCoercionPathSchema>;
export type testCoercionHeadersSchema = z.infer<typeof testCoercionHeadersSchema>;
