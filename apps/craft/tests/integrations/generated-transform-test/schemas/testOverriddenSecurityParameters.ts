import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testOverriddenSecurityQuerySchema = z.object({});
const testOverriddenSecurityPathSchema = z.object({});
const testOverriddenSecurityHeadersSchema = z.object({});

/* Export schemas for external use */
export { testOverriddenSecurityQuerySchema };
export { testOverriddenSecurityPathSchema };
export { testOverriddenSecurityHeadersSchema };

/* Export types for external use */
export type testOverriddenSecurityQuerySchema = z.infer<typeof testOverriddenSecurityQuerySchema>;
export type testOverriddenSecurityPathSchema = z.infer<typeof testOverriddenSecurityPathSchema>;
export type testOverriddenSecurityHeadersSchema = z.infer<typeof testOverriddenSecurityHeadersSchema>;
