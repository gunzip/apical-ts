import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testAuthBearerQuerySchema = z.object({ "qo": z.string().optional(), "qr": z.string(), "cursor": z.string().min(1).optional() });
const testAuthBearerPathSchema = z.object({});
const testAuthBearerHeadersSchema = z.object({});

/* Export schemas for external use */
export { testAuthBearerQuerySchema };
export { testAuthBearerPathSchema };
export { testAuthBearerHeadersSchema };

/* Export types for external use */
export type testAuthBearerQuerySchema = z.infer<typeof testAuthBearerQuerySchema>;
export type testAuthBearerPathSchema = z.infer<typeof testAuthBearerPathSchema>;
export type testAuthBearerHeadersSchema = z.infer<typeof testAuthBearerHeadersSchema>;
