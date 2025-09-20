import { z } from 'zod';
import { catalogmeta } from "./catalogmeta.js";

export const CatalogMeta = catalogmeta;
export type CatalogMeta = z.infer<typeof CatalogMeta>;