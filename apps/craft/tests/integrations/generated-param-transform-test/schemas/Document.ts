import { z } from 'zod';
import { documentalias } from "./documentalias.js";

export const Document = documentalias;
export type Document = z.infer<typeof Document>;