import { z } from 'zod';

export const ObjectDefinitionWithImplicitTypeAndAdditionalProperties = z.object({}).catchall(z.array(z.number()));
export type ObjectDefinitionWithImplicitTypeAndAdditionalProperties = z.infer<typeof ObjectDefinitionWithImplicitTypeAndAdditionalProperties>;