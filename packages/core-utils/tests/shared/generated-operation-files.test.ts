import { describe, expect, it } from "vitest";

import {
  createSanitizedOperationEntries,
  getOperationOutputFilePath,
} from "../../src/shared/generated-operation-files.js";

describe("generated operation file helpers", () => {
  it("adds sanitized operation ids", () => {
    const operations = createSanitizedOperationEntries([
      { operationId: "pets.list-all" },
    ]);

    expect(operations).toEqual([
      {
        operationId: "pets.list-all",
        sanitizedOperationId: "petsListAll",
      },
    ]);
  });

  it("throws when two operation ids sanitize to the same value", () => {
    expect(() =>
      createSanitizedOperationEntries([
        { operationId: "pets-list" },
        { operationId: "pets_list" },
      ]),
    ).toThrow(
      'Duplicate sanitized operation ID "petsList" produced by operation IDs "pets-list" and "pets_list"',
    );
  });

  it("builds output paths from sanitized operation ids", () => {
    expect(getOperationOutputFilePath("/tmp/output", "pets.list-all")).toBe(
      "/tmp/output/petsListAll.ts",
    );
  });
});
