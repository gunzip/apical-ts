import { z } from "zod";

/* Parameter schemas for type-safe inputs */
const testQueryParamInlineEnumQuerySchema = z.object({ "fields[catalog-item-bulk-create-job]": z.array(z.enum(["status", "created_at", "total_count", "completed_count", "failed_count", "completed_at", "errors", "expires_at"])).optional() });
const testQueryParamInlineEnumPathSchema = z.object({});
const testQueryParamInlineEnumHeadersSchema = z.object({});

/* Export schemas for external use */
export { testQueryParamInlineEnumQuerySchema };
export { testQueryParamInlineEnumPathSchema };
export { testQueryParamInlineEnumHeadersSchema };

/* Export types for external use */
export type testQueryParamInlineEnumQuerySchema = z.infer<typeof testQueryParamInlineEnumQuerySchema>;
export type testQueryParamInlineEnumPathSchema = z.infer<typeof testQueryParamInlineEnumPathSchema>;
export type testQueryParamInlineEnumHeadersSchema = z.infer<typeof testQueryParamInlineEnumHeadersSchema>;
