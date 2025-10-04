import { z } from 'zod';
import { catalogmeta2 } from "./catalogmeta2.js";

export const CatalogMeta = catalogmeta2;
export type CatalogMeta = z.infer<typeof CatalogMeta>;