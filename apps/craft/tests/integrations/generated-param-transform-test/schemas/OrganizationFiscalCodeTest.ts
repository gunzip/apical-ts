import { z } from 'zod';

export const OrganizationFiscalCodeTest = z.string();
export type OrganizationFiscalCodeTest = z.infer<typeof OrganizationFiscalCodeTest>;