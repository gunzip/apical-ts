import { z } from 'zod';
import { catalogmetaStrict } from "./catalogmetaStrict.js";

export const CatalogMetaStrict = catalogmetaStrict;
export type CatalogMetaStrict = z.infer<typeof CatalogMetaStrict>;