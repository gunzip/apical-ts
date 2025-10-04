import { z } from 'zod';

export const DefinitionFieldWithDash = z.object({"id-field": z.string().optional()});
export type DefinitionFieldWithDash = z.infer<typeof DefinitionFieldWithDash>;