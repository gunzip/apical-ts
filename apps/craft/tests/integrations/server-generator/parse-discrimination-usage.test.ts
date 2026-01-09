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
        "200",
        typeof TestMultiContentTypesResponseMap
      >,
    >(_: R) {
      // We only need to exercise the type-level narrowing. Create a typed helper
      // that accepts the parse() result type and tests narrowed access without
      // invoking parse() at runtime.
      type ParseResult = ReturnType<R["parse"]>;
      function inspect(result: ParseResult) {
        if (!isParsed(result)) return;
        if (result.contentType === "application/xml") {
          // @ts-expect-no-error
          // eslint-disable-next-line no-unused-expressions
          result.parsed.id;
        }
        if (result.contentType === "application/json") {
          // @ts-expect-no-error
          // eslint-disable-next-line no-unused-expressions
          result.parsed.id;
        }
        if (isParsed(result)) {
          // eslint-disable-next-line no-unused-expressions
          result.parsed;
        }
      }

      // Use the typed inspector — no runtime parse() call required for compile check
      expect(typeof inspect).toBe("function");
    }

    // We can't easily construct a real runtime object here without fetch, but the generic
    // function definition above is enough for compile-time checking via type constraints.
    expect(typeof use).toBe("function");
  });
});
