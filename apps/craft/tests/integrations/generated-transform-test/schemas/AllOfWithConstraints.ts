import { z } from 'zod';
import { FiscalCode } from "./FiscalCode.js";

export const AllOfWithConstraints = z.intersection(FiscalCode, z.string().max(2));
export type AllOfWithConstraints = z.infer<typeof AllOfWithConstraints>;