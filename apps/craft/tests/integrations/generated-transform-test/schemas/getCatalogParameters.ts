import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const getCatalogQuerySchema = z.object({ "url": z.url().optional(), "status": z.enum(["live", "archived"]).optional(), "collection": z.string().optional(), "q": z.string().optional() });
const getCatalogPathSchema = z.object({});
const getCatalogHeadersSchema = z.object({});

/* Export schemas for external use */
export { getCatalogQuerySchema };
export { getCatalogPathSchema };
export { getCatalogHeadersSchema };

/* Export types for external use */
export type getCatalogQuerySchema = z.infer<typeof getCatalogQuerySchema>;
export type getCatalogPathSchema = z.infer<typeof getCatalogPathSchema>;
export type getCatalogHeadersSchema = z.infer<typeof getCatalogHeadersSchema>;
