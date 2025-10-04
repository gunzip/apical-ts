import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const createUserWithRequestBodiesQuerySchema = z.object({});
const createUserWithRequestBodiesPathSchema = z.object({});
const createUserWithRequestBodiesHeadersSchema = z.object({});

/* Export schemas for external use */
export { createUserWithRequestBodiesQuerySchema };
export { createUserWithRequestBodiesPathSchema };
export { createUserWithRequestBodiesHeadersSchema };

/* Export types for external use */
export type createUserWithRequestBodiesQuerySchema = z.infer<typeof createUserWithRequestBodiesQuerySchema>;
export type createUserWithRequestBodiesPathSchema = z.infer<typeof createUserWithRequestBodiesPathSchema>;
export type createUserWithRequestBodiesHeadersSchema = z.infer<typeof createUserWithRequestBodiesHeadersSchema>;
