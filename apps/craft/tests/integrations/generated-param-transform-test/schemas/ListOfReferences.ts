import { z } from 'zod';
import { DefinitionFieldWithDash } from "./DefinitionFieldWithDash.js";

/**
 * a definition which is a list of references to other definitions.
 */
export const ListOfReferences = z.array(DefinitionFieldWithDash);
export type ListOfReferences = z.infer<typeof ListOfReferences>;