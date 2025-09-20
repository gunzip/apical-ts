import { z } from 'zod';
import { catalog } from "./catalog.js";

/**
 * Response schema for GetCatalog200
 */
export const GetCatalog200Response = z.array(catalog);
export type GetCatalog200Response = z.infer<typeof GetCatalog200Response>;