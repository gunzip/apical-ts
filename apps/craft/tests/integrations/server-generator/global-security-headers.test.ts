import { describe, expect, it } from "vitest";

import {
  getCatalogParsedParams,
  getCatalogServerParsedParams,
} from "../generated/schemas/getCatalogParameters.js";

describe("Generated global security header schemas", () => {
  it("keeps client auth headers out of params while validating them on server routes", () => {
    const clientHeadersParse = getCatalogParsedParams.shape.headers.safeParse(
      {},
    );
    const serverHeadersParse =
      getCatalogServerParsedParams.shape.headers.safeParse({
        "custom-token": "test-token",
      });
    const missingServerHeadersParse =
      getCatalogServerParsedParams.shape.headers.safeParse({});

    expect(clientHeadersParse.success).toBe(true);
    expect(serverHeadersParse.success).toBe(true);
    expect(missingServerHeadersParse.success).toBe(false);
  });
});
