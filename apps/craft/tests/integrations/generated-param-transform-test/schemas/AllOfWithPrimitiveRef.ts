import { z } from 'zod';
import { FiscalCode } from "./FiscalCode.js";

export const AllOfWithPrimitiveRef = FiscalCode;
export type AllOfWithPrimitiveRef = z.infer<typeof AllOfWithPrimitiveRef>;