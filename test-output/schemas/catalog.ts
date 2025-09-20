import { z } from 'zod';
import { catalogmeta } from "./catalogmeta.js";

export const catalog = catalogmeta;
export type catalog = z.infer<typeof catalog>;