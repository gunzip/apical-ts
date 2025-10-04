import { z } from 'zod';

export const OrganizationFiscalCode = z.string();
export type OrganizationFiscalCode = z.infer<typeof OrganizationFiscalCode>;