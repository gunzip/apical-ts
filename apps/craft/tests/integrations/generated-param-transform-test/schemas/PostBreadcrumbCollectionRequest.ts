import { z } from 'zod';

/**
 * Request schema for postBreadcrumbCollection operation
 */
export const PostBreadcrumbCollectionRequest = z.instanceof(Blob);
export type PostBreadcrumbCollectionRequest = z.infer<typeof PostBreadcrumbCollectionRequest>;