import { z } from 'zod';

/**
 * test if we can use allOf with just one element inside
 */
export const AllOfWithOneElementTest = z.object({...z.object({"key": z.string().optional()}).shape});
export type AllOfWithOneElementTest = z.infer<typeof AllOfWithOneElementTest>;