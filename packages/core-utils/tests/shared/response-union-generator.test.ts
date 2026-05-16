import { describe, expect, it } from "vitest";

import { generateResponseUnion } from "../../src/shared/response-union-generator.js";

describe("response union generator", () => {
  it("expands lowercase wildcard response codes", () => {
    const result = generateResponseUnion(
      {
        responses: {
          "200": { description: "OK" },
          "4xx": { description: "Client error" },
          "5xx": { description: "Server error" },
        },
      },
      "testOperation",
      new Set<string>(),
    );

    expect(result.unionMembers).toEqual(
      expect.arrayContaining([
        { statusCode: "200" },
        { statusCode: "400" },
        { statusCode: "451" },
        { statusCode: "499" },
        { statusCode: "500" },
        { statusCode: "511" },
        { statusCode: "599" },
      ]),
    );
    // Wildcard codes should not appear in expanded output
    expect(result.unionMembers).not.toEqual(
      expect.arrayContaining([{ statusCode: "4xx" }, { statusCode: "5xx" }]),
    );
    // Non-standard codes that are not real HTTP statuses should not be included
    expect(result.unionMembers).not.toEqual(
      expect.arrayContaining([{ statusCode: "452" }, { statusCode: "512" }]),
    );
  });
});
