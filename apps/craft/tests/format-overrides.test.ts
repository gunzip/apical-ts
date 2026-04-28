import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  parseFormatOverrideArgument,
  parseFormatOverrideArguments,
} from "../src/format-overrides.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const craftRoot = resolve(__dirname, "..");

describe("format overrides parser", () => {
  it("parses package specifiers with an explicit export name", () => {
    expect(
      parseFormatOverrideArgument("tax-code=@acme/domain#TaxCode", craftRoot),
    ).toEqual({
      format: "tax-code",
      import: {
        kind: "module",
        specifier: "@acme/domain",
      },
      importName: "TaxCode",
    });
  });

  it("infers the export name from a project path", () => {
    expect(
      parseFormatOverrideArgument(
        "tax-code=./tests/integrations/fixtures/format-overrides/TaxCode.ts",
        craftRoot,
      ),
    ).toEqual({
      format: "tax-code",
      import: {
        kind: "path",
        path: join(
          craftRoot,
          "tests/integrations/fixtures/format-overrides/TaxCode.ts",
        ),
      },
      importName: "TaxCode",
    });
  });

  it("rejects duplicate mappings for the same format", () => {
    expect(() =>
      parseFormatOverrideArguments(
        [
          "tax-code=./tests/integrations/fixtures/format-overrides/TaxCode.ts",
          "tax-code=@acme/domain#TaxCode",
        ],
        craftRoot,
      ),
    ).toThrow(/Duplicate --format override/);
  });

  it("rejects malformed export names", () => {
    expect(() =>
      parseFormatOverrideArgument(
        "tax-code=@acme/domain#not-valid!",
        craftRoot,
      ),
    ).toThrow(/Invalid export name/);
  });
});
