import { describe, expect, it } from "vitest";

import { parseZodSource } from "../src/ast-parser.js";
import { convertZodToArktype } from "../src/zod-to-arktype.js";

function convertSource(source: string): string {
  const { declarations } = parseZodSource(source);
  if (declarations.length === 0) return "";
  return convertZodToArktype(declarations[0].callChain).code;
}

describe("array type conversions", () => {
  it("converts z.array(z.string())", () => {
    const result = convertSource(`const x = z.array(z.string());`);
    expect(result).toBe(`type("string[]")`);
  });

  it("converts z.array(z.number().int())", () => {
    const result = convertSource(`const x = z.array(z.number().int());`);
    expect(result).toBe(`type("number.integer[]")`);
  });

  it("converts z.array(z.unknown())", () => {
    const result = convertSource(`const x = z.array(z.unknown());`);
    expect(result).toBe(`type("unknown[]")`);
  });
});

describe("union type conversions", () => {
  it("converts z.union of literals to union string", () => {
    const result = convertSource(
      `const x = z.union([z.literal("active"), z.literal("inactive")]);`,
    );
    expect(result).toBe(`type("'active' | 'inactive'")`);
  });

  it("converts z.union with schema references", () => {
    const result = convertSource(
      `const x = z.union([ValueOperand, FunctionOperand]);`,
    );
    expect(result).toContain("ValueOperand");
    expect(result).toContain("FunctionOperand");
  });

  it("converts z.discriminatedUnion", () => {
    const result = convertSource(
      `const x = z.discriminatedUnion("type", [SchemaA, SchemaB]);`,
    );
    expect(result).toContain("SchemaA");
    expect(result).toContain("SchemaB");
  });
});

describe("lazy (recursive) type conversions", () => {
  it("converts z.lazy(() => SomeSchema) to reference", () => {
    const { declarations } = parseZodSource(
      `const x = z.lazy(() => TreeNode);`,
    );
    const result = convertZodToArktype(declarations[0].callChain);
    expect(result.code).toBe("TreeNode");
    expect(result.referencedSchemas.has("TreeNode")).toBe(true);
  });
});
