import { z } from 'zod';
import { catalog2 } from "./catalog2.js";

/**
 * Response schema for GetCatalog200
 */
export const GetCatalog200Response = z.array(catalog2);
export type GetCatalog200Response = z.infer<typeof GetCatalog200Response>;