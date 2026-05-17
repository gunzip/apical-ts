import { describe, expect, it } from "vitest";

import type { SchemaObject } from "openapi3-ts/oas31";

import { createStringFormatOverrideRegistry } from "../../src/schema-generator/format-overrides.js";
import {
  shouldInlineTypes,
  tryRenderFallbackTypeAlias,
  tryRenderInlineTypeAlias,
} from "../../src/schema-generator/inline-type-renderer.js";

describe("inline-type-renderer", () => {
  it("inlines simple object schemas once the global schema threshold is met", () => {
    const schema: SchemaObject = {
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      type: "object",
    };

    expect(
      shouldInlineTypes({
        schema,
        totalGeneratedSchemaCount: 100,
      }),
    ).toBe(true);
    expect(
      tryRenderInlineTypeAlias("User", schema, {
        totalGeneratedSchemaCount: 100,
      }),
    ).toBe('export type User = { "name": string };');
  });

  it("keeps fallback aliases on z.infer below the global threshold", () => {
    expect(
      tryRenderFallbackTypeAlias("AllowAnything", true, {
        totalGeneratedSchemaCount: 99,
      }),
    ).toBeUndefined();
  });

  it("does not inline schemas with defaults", () => {
    const schema: SchemaObject = {
      properties: {
        name: {
          default: "anon",
          type: "string",
        },
      },
      type: "object",
    };

    expect(
      shouldInlineTypes({
        schema,
        totalGeneratedSchemaCount: 100,
      }),
    ).toBe(false);
  });

  it("does not inline schemas that rely on format overrides", () => {
    const schema: SchemaObject = {
      format: "tax-code",
      type: "string",
    };
    const formatOverrides = createStringFormatOverrideRegistry([
      {
        format: "tax-code",
        import: { kind: "module", specifier: "@acme/tax-code" },
        importName: "TaxCode",
      },
    ]);

    expect(
      shouldInlineTypes({
        formatOverrides,
        schema,
        totalGeneratedSchemaCount: 100,
      }),
    ).toBe(false);
  });
});
