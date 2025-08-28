import { describe, it, expect } from "vitest";
import type { ApiResponseWithParse } from "../generated/client/config.js";
import { isParsed } from "../generated/client/config.js";
import type { TestMultiContentTypesResponseMap } from "../generated/client/testMultiContentTypes.js";

// Type-level narrowing check: if this file type-checks, the discriminated union works.
describe("parse() discriminated union usage", () => {
  it("narrows parsed type based on contentType", () => {
    // Create a helper that accepts the response and exercises narrowing.
    function use<
      R extends ApiResponseWithParse<
        200,
        typeof TestMultiContentTypesResponseMap
      >,
    >(res: R) {
      const result = res.parse();
      // Filter out non-success parse variants first
      if (!isParsed(result)) return;
      if (result.contentType === "application/xml") {
        // @ts-expect-no-error
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        result.parsed.id;
      }
      if (result.contentType === "application/json") {
        // @ts-expect-no-error
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        result.parsed.id;
      }

      // Direct type guard on a generic narrowing
      if (isParsed(result)) {
        // parsed is present, can access common properties safely
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        result.parsed;
      }
    }

    // We can't easily construct a real runtime object here without fetch, but the generic
    // function definition above is enough for compile-time checking via type constraints.
    expect(typeof use).toBe("function");
  });
});
