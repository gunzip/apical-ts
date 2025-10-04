import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const postBreadcrumbCollectionQuerySchema = z.object({});
const postBreadcrumbCollectionPathSchema = z.object({ "collection": z.string() });
const postBreadcrumbCollectionHeadersSchema = z.object({});

/* Export schemas for external use */
export { postBreadcrumbCollectionQuerySchema };
export { postBreadcrumbCollectionPathSchema };
export { postBreadcrumbCollectionHeadersSchema };

/* Export types for external use */
export type postBreadcrumbCollectionQuerySchema = z.infer<typeof postBreadcrumbCollectionQuerySchema>;
export type postBreadcrumbCollectionPathSchema = z.infer<typeof postBreadcrumbCollectionPathSchema>;
export type postBreadcrumbCollectionHeadersSchema = z.infer<typeof postBreadcrumbCollectionHeadersSchema>;
