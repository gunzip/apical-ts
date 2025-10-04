import { z } from 'zod';

/**
 * a definition which is a list of other definitions.
 */
export const ListOfDefinitions = z.array(z.object({"field": z.string().optional()}));
export type ListOfDefinitions = z.infer<typeof ListOfDefinitions>;