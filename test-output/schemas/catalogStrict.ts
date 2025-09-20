import { z } from 'zod';
import { catalogmetaStrict } from "./catalogmetaStrict.js";

export const catalogStrict = catalogmetaStrict;
export type catalogStrict = z.infer<typeof catalogStrict>;