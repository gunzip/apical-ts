import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testRequestBodiesQuerySchema = z.object({});
const testRequestBodiesPathSchema = z.object({});
const testRequestBodiesHeadersSchema = z.object({});

/* Export schemas for external use */
export { testRequestBodiesQuerySchema };
export { testRequestBodiesPathSchema };
export { testRequestBodiesHeadersSchema };

/* Export types for external use */
export type testRequestBodiesQuerySchema = z.infer<typeof testRequestBodiesQuerySchema>;
export type testRequestBodiesPathSchema = z.infer<typeof testRequestBodiesPathSchema>;
export type testRequestBodiesHeadersSchema = z.infer<typeof testRequestBodiesHeadersSchema>;
