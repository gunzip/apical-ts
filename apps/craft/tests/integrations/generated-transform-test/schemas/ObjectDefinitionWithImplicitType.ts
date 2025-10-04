import { z } from 'zod';

export const ObjectDefinitionWithImplicitType = z.object({"prop_one": z.string().optional(), "prop_two": z.string().optional()});
export type ObjectDefinitionWithImplicitType = z.infer<typeof ObjectDefinitionWithImplicitType>;