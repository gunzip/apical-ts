import { describe, expect, it } from "vitest";

import { parseZodSource } from "../src/ast-parser.js";
import { convertZodToArktype } from "../src/zod-to-arktype.js";

function convertSource(source: string): string {
  const { declarations } = parseZodSource(source);
  if (declarations.length === 0) return "";
  return convertZodToArktype(declarations[0].callChain).code;
}

describe("object type conversions", () => {
  it("converts z.object with string properties", () => {
    const result = convertSource(
      `const x = z.object({"name": z.string(), "age": z.number()});`,
    );
    expect(result).toBe(`type({ "name": "string", "age": "number" })`);
  });

  it("converts z.strictObject with reject undeclared", () => {
    const result = convertSource(
      `const x = z.strictObject({"name": z.string()});`,
    );
    expect(result).toBe(`type({ "name": "string", "+": "reject" })`);
  });

  it("handles optional properties", () => {
    const result = convertSource(
      `const x = z.object({"name": z.string().optional()});`,
    );
    expect(result).toBe(`type({ "name?": "string" })`);
  });

  it("handles nullable properties", () => {
    const result = convertSource(
      `const x = z.object({"email": z.string().nullable()});`,
    );
    expect(result).toBe(`type({ "email": "string | null" })`);
  });

  it("handles default values", () => {
    const result = convertSource(
      `const x = z.object({"enabled": z.boolean().default(false)});`,
    );
    expect(result).toBe(`type({ "enabled?": ["boolean", "=", false] })`);
  });

  it("converts empty object", () => {
    const result = convertSource(`const x = z.object({});`);
    expect(result).toBe(`type({})`);
  });

  it("handles catchall (index signature)", () => {
    const result = convertSource(
      `const x = z.object({}).catchall(z.string());`,
    );
    expect(result).toBe(`type({ "[string]": "string" })`);
  });
});

describe("record type conversions", () => {
  it("converts z.record(z.string(), z.number())", () => {
    const result = convertSource(`const x = z.record(z.string(), z.number());`);
    expect(result).toBe(`type({ "[string]": "number" })`);
  });
});
