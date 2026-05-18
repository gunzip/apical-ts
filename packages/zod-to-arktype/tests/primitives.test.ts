import { describe, expect, it } from "vitest";

import { parseZodSource } from "../src/ast-parser.js";
import { convertZodToArktype } from "../src/zod-to-arktype.js";

function convertSource(source: string): string {
  const { declarations } = parseZodSource(source);
  if (declarations.length === 0) return "";
  return convertZodToArktype(declarations[0].callChain).code;
}

describe("primitive type conversions", () => {
  it('converts z.string() to type("string")', () => {
    expect(convertSource(`const x = z.string();`)).toBe(`type("string")`);
  });

  it('converts z.number() to type("number")', () => {
    expect(convertSource(`const x = z.number();`)).toBe(`type("number")`);
  });

  it('converts z.boolean() to type("boolean")', () => {
    expect(convertSource(`const x = z.boolean();`)).toBe(`type("boolean")`);
  });

  it('converts z.bigint() to type("bigint")', () => {
    expect(convertSource(`const x = z.bigint();`)).toBe(`type("bigint")`);
  });

  it('converts z.unknown() to type("unknown")', () => {
    expect(convertSource(`const x = z.unknown();`)).toBe(`type("unknown")`);
  });

  it('converts z.null() to type("null")', () => {
    expect(convertSource(`const x = z.null();`)).toBe(`type("null")`);
  });

  it('converts z.undefined() to type("undefined")', () => {
    expect(convertSource(`const x = z.undefined();`)).toBe(`type("undefined")`);
  });
});

describe("literal conversions", () => {
  it('converts z.literal(true) to type("true")', () => {
    expect(convertSource(`const x = z.literal(true);`)).toBe(`type("true")`);
  });

  it('converts z.literal(false) to type("false")', () => {
    expect(convertSource(`const x = z.literal(false);`)).toBe(`type("false")`);
  });

  it('converts z.literal("hello") to type("\'hello\'")', () => {
    expect(convertSource(`const x = z.literal("hello");`)).toBe(
      `type("'hello'")`,
    );
  });

  it('converts z.literal(42) to type("42")', () => {
    expect(convertSource(`const x = z.literal(42);`)).toBe(`type("42")`);
  });
});

describe("enum conversions", () => {
  it("converts z.enum to union of string literals", () => {
    expect(
      convertSource(`const x = z.enum(["active", "inactive", "pending"]);`),
    ).toBe(`type("'active' | 'inactive' | 'pending'")`);
  });

  it("converts single-value enum to single literal", () => {
    expect(convertSource(`const x = z.enum(["only"]);`)).toBe(`type("'only'")`);
  });
});

describe("string format constraints", () => {
  it("converts .email() to string.email", () => {
    expect(convertSource(`const x = z.string().email();`)).toBe(
      `type("string.email")`,
    );
  });

  it("converts .url() to string.url", () => {
    expect(convertSource(`const x = z.string().url();`)).toBe(
      `type("string.url")`,
    );
  });

  it("converts .uuid() to string.uuid", () => {
    expect(convertSource(`const x = z.string().uuid();`)).toBe(
      `type("string.uuid")`,
    );
  });
});

describe("number constraints", () => {
  it("converts .int() to number.integer", () => {
    expect(convertSource(`const x = z.number().int();`)).toBe(
      `type("number.integer")`,
    );
  });

  it("converts .min(N) to number >= N", () => {
    expect(convertSource(`const x = z.number().min(0);`)).toBe(
      `type("number >= 0")`,
    );
  });

  it("converts .max(N) to number <= N", () => {
    expect(convertSource(`const x = z.number().max(100);`)).toBe(
      `type("number <= 100")`,
    );
  });

  it("converts .gt(N) to number > N", () => {
    expect(convertSource(`const x = z.number().gt(5);`)).toBe(
      `type("number > 5")`,
    );
  });

  it("converts .lt(N) to number < N", () => {
    expect(convertSource(`const x = z.number().lt(10);`)).toBe(
      `type("number < 10")`,
    );
  });
});

describe("string length constraints", () => {
  it("converts .min(N) to string >= N", () => {
    expect(convertSource(`const x = z.string().min(1);`)).toBe(
      `type("string >= 1")`,
    );
  });

  it("converts .max(N) to string <= N", () => {
    expect(convertSource(`const x = z.string().max(255);`)).toBe(
      `type("string <= 255")`,
    );
  });

  it("converts chained .min(N).max(M) to combined range", () => {
    expect(convertSource(`const x = z.string().min(1).max(255);`)).toBe(
      `type("string >= 1 & string <= 255")`,
    );
  });

  it("converts chained number .min(N).max(M) to combined range", () => {
    expect(convertSource(`const x = z.number().min(0).max(100);`)).toBe(
      `type("number >= 0 & number <= 100")`,
    );
  });
});

describe("coerce conversions", () => {
  it("converts z.coerce.bigint() with coercion note", () => {
    const result = convertSource(`const x = z.coerce.bigint();`);
    expect(result).toContain(`type("bigint")`);
    expect(result).toContain("coercion");
  });
});
