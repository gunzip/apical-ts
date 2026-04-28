import * as z from "zod";
export const TaxCode = z.union([z.literal("TAX-001"), z.literal("TAX-002")]);
