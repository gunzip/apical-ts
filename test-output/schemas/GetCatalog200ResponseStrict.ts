import { z } from 'zod';
import { catalogStrict } from "./catalogStrict.js";

/**
 * Response schema for GetCatalog operationStrict
 */
export const GetCatalog200ResponseStrict = z.array(catalogStrict);
export type GetCatalog200ResponseStrict = z.infer<typeof GetCatalog200ResponseStrict>;