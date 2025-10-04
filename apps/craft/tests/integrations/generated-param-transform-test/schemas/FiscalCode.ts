import { z } from 'zod';

/**
 * User's fiscal code.
 */
export const FiscalCode = z.string().regex(new RegExp("^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$"));
export type FiscalCode = z.infer<typeof FiscalCode>;