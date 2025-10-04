import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const postUnsupportedContentTypeQuerySchema = z.object({});
const postUnsupportedContentTypePathSchema = z.object({ "contentType": z.string() });
const postUnsupportedContentTypeHeadersSchema = z.object({});

/* Export schemas for external use */
export { postUnsupportedContentTypeQuerySchema };
export { postUnsupportedContentTypePathSchema };
export { postUnsupportedContentTypeHeadersSchema };

/* Export types for external use */
export type postUnsupportedContentTypeQuerySchema = z.infer<typeof postUnsupportedContentTypeQuerySchema>;
export type postUnsupportedContentTypePathSchema = z.infer<typeof postUnsupportedContentTypePathSchema>;
export type postUnsupportedContentTypeHeadersSchema = z.infer<typeof postUnsupportedContentTypeHeadersSchema>;
