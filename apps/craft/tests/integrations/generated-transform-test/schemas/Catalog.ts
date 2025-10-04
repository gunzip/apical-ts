import { z } from 'zod';
import { catalog2 } from "./catalog2.js";

export const Catalog = catalog2;
export type Catalog = z.infer<typeof Catalog>;