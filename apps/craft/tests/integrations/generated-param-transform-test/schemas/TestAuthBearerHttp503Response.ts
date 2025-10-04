import { z } from 'zod';
import { SimpleDefinition } from "./SimpleDefinition.js";

/**
 * Response schema for TestAuthBearerHttp503
 */
export const TestAuthBearerHttp503Response = z.object({"prop1": SimpleDefinition, "prop2": z.string().optional()});
export type TestAuthBearerHttp503Response = z.infer<typeof TestAuthBearerHttp503Response>;