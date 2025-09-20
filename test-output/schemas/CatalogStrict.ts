import { z } from 'zod';
import { catalogStrict } from "./catalogStrict.js";

export const CatalogStrict = catalogStrict;
export type CatalogStrict = z.infer<typeof CatalogStrict>;