/**
 * Example transform file for adding defaults to query parameters
 * 
 * Usage:
 *   pnpm start generate -i openapi.yaml -o ./generated --client --zod-transform ./my-transform.js
 */

export default function zodTransform(schema, ctx) {
  // Example 1: Add default to specific query parameter schema
  if (ctx.exportName === "testQueryParamInlineEnumQuerySchema") {
    return schema.default({ "fields[catalog-item-bulk-create-job]": ["created_at"] });
  }

  // Example 2: Add branding to component schemas
  if (ctx.kind === "component" && ctx.componentName === "Profile") {
    return schema.brand();
  }

  // Example 3: Transform all component schemas
  if (ctx.kind === "component") {
    // Add custom logic here
    return schema;
  }

  // Return schema unchanged for everything else
  return schema;
}
