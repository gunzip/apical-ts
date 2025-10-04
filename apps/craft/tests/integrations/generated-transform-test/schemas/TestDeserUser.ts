import { z } from 'zod';

export const TestDeserUser = z.object({"name": z.string(), "age": z.number().int()});
export type TestDeserUser = z.infer<typeof TestDeserUser>;