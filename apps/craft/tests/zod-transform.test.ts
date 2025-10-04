import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { TransformContext } from "../src/core-generator/index.js";

describe("Zod Transform Feature", () => {
  it("should apply transform to add default value to enum", () => {
    /* Sample transform that adds default value to a specific schema */
    const zodTransform = (schema: z.ZodTypeAny, ctx: TransformContext) => {
      if (ctx.exportName === "testQueryParamInlineEnumQuerySchema") {
        /* Add default value to the schema */
        return schema.default({
          "fields[catalog-item-bulk-create-job]": ["created_at"],
        });
      }
      return schema;
    };

    /* Test that the transform can be applied to a schema */
    const originalSchema = z.object({
      "fields[catalog-item-bulk-create-job]": z
        .array(
          z.enum([
            "status",
            "created_at",
            "total_count",
            "completed_count",
            "failed_count",
            "completed_at",
            "errors",
            "expires_at",
          ]),
        )
        .optional(),
    });

    const ctx: TransformContext = {
      exportName: "testQueryParamInlineEnumQuerySchema",
      kind: "parameter",
      location: "inline",
      operationId: "testQueryParamInlineEnum",
      pointer: "#/paths/~1test-query-param-inline-enum/get/parameters/0",
      in: "query",
      name: "fields[catalog-item-bulk-create-job]",
    };

    const transformed = zodTransform(originalSchema, ctx);

    /* Verify the default was added */
    const parseResult = transformed.safeParse(undefined);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data).toEqual({
        "fields[catalog-item-bulk-create-job]": ["created_at"],
      });
    }
  });

  it("should apply branding to component schemas", () => {
    const zodTransform = (schema: z.ZodTypeAny, ctx: TransformContext) => {
      if (ctx.componentName === "Person") {
        return schema.brand<"Person">();
      }
      return schema;
    };

    const originalSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const ctx: TransformContext = {
      exportName: "Person",
      componentName: "Person",
      kind: "component",
      location: "components",
      pointer: "#/components/schemas/Person",
    };

    const transformed = zodTransform(originalSchema, ctx);

    /* Verify branding was applied - brand returns the original schema, so test parsing */
    const validData = { name: "John", age: 30 };
    const parseResult = transformed.safeParse(validData);
    expect(parseResult.success).toBe(true);
  });
});
