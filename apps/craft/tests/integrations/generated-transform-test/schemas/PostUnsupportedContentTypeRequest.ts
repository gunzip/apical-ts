import { z } from 'zod';

/**
 * Request schema for postUnsupportedContentType operation
 */
export const PostUnsupportedContentTypeRequest = z.instanceof(Blob);
export type PostUnsupportedContentTypeRequest = z.infer<typeof PostUnsupportedContentTypeRequest>;