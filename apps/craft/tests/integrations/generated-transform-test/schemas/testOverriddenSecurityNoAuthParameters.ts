import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testOverriddenSecurityNoAuthQuerySchema = z.object({});
const testOverriddenSecurityNoAuthPathSchema = z.object({});
const testOverriddenSecurityNoAuthHeadersSchema = z.object({});

/* Export schemas for external use */
export { testOverriddenSecurityNoAuthQuerySchema };
export { testOverriddenSecurityNoAuthPathSchema };
export { testOverriddenSecurityNoAuthHeadersSchema };

/* Export types for external use */
export type testOverriddenSecurityNoAuthQuerySchema = z.infer<typeof testOverriddenSecurityNoAuthQuerySchema>;
export type testOverriddenSecurityNoAuthPathSchema = z.infer<typeof testOverriddenSecurityNoAuthPathSchema>;
export type testOverriddenSecurityNoAuthHeadersSchema = z.infer<typeof testOverriddenSecurityNoAuthHeadersSchema>;
