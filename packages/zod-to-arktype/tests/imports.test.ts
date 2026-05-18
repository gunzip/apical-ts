import { describe, expect, it } from "vitest";

import { rewriteImports } from "../src/import-rewriter.js";

describe("import rewriting", () => {
  it("replaces zod import with arktype import", () => {
    const result = rewriteImports(
      [{ names: ["z"], moduleSpecifier: "zod" }],
      new Set(),
      true,
    );
    expect(result).toContain(`import { type } from "arktype";`);
    expect(result.join("\n")).not.toContain("zod");
  });

  it("preserves cross-file schema imports that are referenced", () => {
    const result = rewriteImports(
      [{ names: ["User", "Address"], moduleSpecifier: "./User.js" }],
      new Set(["User"]),
      true,
    );
    expect(result).toContain(`import { User } from "./User.js";`);
    expect(result.join("\n")).not.toContain("Address");
  });

  it("drops unused schema imports", () => {
    const result = rewriteImports(
      [{ names: ["Unused"], moduleSpecifier: "./Unused.js" }],
      new Set(),
      true,
    );
    expect(result.length).toBe(1); // only arktype import
  });

  it("drops @standard-schema imports", () => {
    const result = rewriteImports(
      [
        {
          names: ["StandardSchemaV1"],
          moduleSpecifier: "@standard-schema/spec",
        },
      ],
      new Set(),
      true,
    );
    expect(result.join("\n")).not.toContain("standard-schema");
  });
});
