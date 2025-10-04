import { z } from 'zod';

export const EmailAddress = z.email();
export type EmailAddress = z.infer<typeof EmailAddress>;