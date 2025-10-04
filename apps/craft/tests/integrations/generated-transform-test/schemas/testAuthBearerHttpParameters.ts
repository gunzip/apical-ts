import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testAuthBearerHttpQuerySchema = z.object({ "qo": z.string().optional(), "qr": z.string(), "cursor": z.string().min(1).optional() });
const testAuthBearerHttpPathSchema = z.object({});
const testAuthBearerHttpHeadersSchema = z.object({});

/* Export schemas for external use */
export { testAuthBearerHttpQuerySchema };
export { testAuthBearerHttpPathSchema };
export { testAuthBearerHttpHeadersSchema };

/* Export types for external use */
export type testAuthBearerHttpQuerySchema = z.infer<typeof testAuthBearerHttpQuerySchema>;
export type testAuthBearerHttpPathSchema = z.infer<typeof testAuthBearerHttpPathSchema>;
export type testAuthBearerHttpHeadersSchema = z.infer<typeof testAuthBearerHttpHeadersSchema>;
