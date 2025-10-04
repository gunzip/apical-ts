import { z } from 'zod';
import { catalogmeta2 } from "./catalogmeta2.js";

export const catalog2 = z.object({...catalogmeta2.shape});
export type catalog2 = z.infer<typeof catalog2>;