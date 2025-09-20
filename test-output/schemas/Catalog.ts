import { z } from 'zod';
import { catalog } from "./catalog.js";

export const Catalog = catalog;
export type Catalog = z.infer<typeof Catalog>;