import { describe, expect, it } from "vitest";

import { createStringFormatOverrideRegistry } from "../../src/schema-generator/format-overrides.js";

describe("string format override registry", () => {
  it("creates a registry for valid overrides", () => {
    const registry = createStringFormatOverrideRegistry([
      {
        format: "tax-code",
        import: {
          kind: "module",
          specifier: "@acme/domain",
        },
        importName: "TaxCode",
      },
    ]);

    expect(registry.get("tax-code")).toEqual({
      format: "tax-code",
      import: {
        kind: "module",
        specifier: "@acme/domain",
      },
      importName: "TaxCode",
    });
  });

  it("rejects duplicate formats", () => {
    expect(() =>
      createStringFormatOverrideRegistry([
        {
          format: "tax-code",
          import: {
            kind: "module",
            specifier: "@acme/domain",
          },
          importName: "TaxCode",
        },
        {
          format: "tax-code",
          import: {
            kind: "module",
            specifier: "@acme/domain",
          },
          importName: "AnotherTaxCode",
        },
      ]),
    ).toThrow('Duplicate string format override for format "tax-code".');
  });

  it("rejects duplicate reference names derived from different formats", () => {
    expect(() =>
      createStringFormatOverrideRegistry([
        {
          format: "tax-code",
          import: {
            kind: "module",
            specifier: "@acme/domain",
          },
          importName: "TaxCode",
        },
        {
          format: "tax_code",
          import: {
            kind: "module",
            specifier: "@acme/domain",
          },
          importName: "TaxCodeSchema",
        },
      ]),
    ).toThrow(
      'Duplicate string format override reference name "__apicalStringFormatTaxCode" derived from format "tax_code".',
    );
  });

  it("rejects blank formats", () => {
    expect(() =>
      createStringFormatOverrideRegistry([
        {
          format: "   ",
          import: {
            kind: "module",
            specifier: "@acme/domain",
          },
          importName: "TaxCode",
        },
      ]),
    ).toThrow("String format override format must be a non-empty string.");
  });

  it("rejects invalid import names", () => {
    expect(() =>
      createStringFormatOverrideRegistry([
        {
          format: "tax-code",
          import: {
            kind: "module",
            specifier: "@acme/domain",
          },
          importName: "not-valid!",
        },
      ]),
    ).toThrow(
      'String format override "tax-code" has an invalid importName "not-valid!".',
    );
  });
});
