import { describe, expect, it } from "vitest";

import { parseZodSource } from "../src/ast-parser.js";

describe("export { X } re-export handling", () => {
  it("marks variables as exported when re-exported via export { X }", () => {
    const source = `
import * as z from "zod";
const fooQuerySchema = z.object({});
const fooPathSchema = z.object({ "id": z.number().int() });
export { fooQuerySchema };
export { fooPathSchema };
export type fooQuerySchema = z.infer<typeof fooQuerySchema>;
export type fooPathSchema = z.infer<typeof fooPathSchema>;
`;
    const { declarations } = parseZodSource(source);
    expect(declarations).toHaveLength(2);
    expect(declarations[0].name).toBe("fooQuerySchema");
    expect(declarations[0].isExported).toBe(true);
    expect(declarations[0].hasTypeExport).toBe(true);
    expect(declarations[1].name).toBe("fooPathSchema");
    expect(declarations[1].isExported).toBe(true);
    expect(declarations[1].hasTypeExport).toBe(true);
  });
});

describe("type aliases with different names", () => {
  it("captures type FooType = z.infer<typeof Foo> as a separate alias", () => {
    const source = `
import * as z from "zod";
export const fooParsedParams = z.object({});
export type fooParsedParamsType = z.infer<typeof fooParsedParams>;
export const fooServerParsedParams = z.object({});
export type fooServerParsedParamsType = z.infer<typeof fooServerParsedParams>;
`;
    const { declarations, typeAliases } = parseZodSource(source);
    expect(declarations).toHaveLength(2);
    expect(declarations[0].hasTypeExport).toBe(false);
    expect(declarations[1].hasTypeExport).toBe(false);

    expect(typeAliases).toHaveLength(2);
    expect(typeAliases[0].name).toBe("fooParsedParamsType");
    expect(typeAliases[0].referencedConst).toBe("fooParsedParams");
    expect(typeAliases[0].isExported).toBe(true);
    expect(typeAliases[1].name).toBe("fooServerParsedParamsType");
    expect(typeAliases[1].referencedConst).toBe("fooServerParsedParams");
  });
});

describe("full parameter file conversion", () => {
  it("converts a complete parameter file with re-exports and type aliases", () => {
    const source = `
import * as z from "zod";
const fooHeadersSchema = z.object({ "X-Auth-Email": z.string() });
const fooServerHeadersSchema = z.object({ "x-auth-email": z.string() });
export { fooHeadersSchema };
export { fooServerHeadersSchema };
export type fooHeadersSchema = z.infer<typeof fooHeadersSchema>;
export type fooServerHeadersSchema = z.infer<typeof fooServerHeadersSchema>;
export const fooParsedParams = z.object({ headers: fooHeadersSchema });
export type fooParsedParamsType = z.infer<typeof fooParsedParams>;
export const fooServerParsedParams = z.object({ headers: fooServerHeadersSchema });
export type fooServerParsedParamsType = z.infer<typeof fooServerParsedParams>;
`;
    const { declarations, typeAliases } = parseZodSource(source);

    /* All 4 schemas parsed */
    expect(declarations).toHaveLength(4);

    /* Re-exported schemas are marked as exported */
    expect(declarations[0].name).toBe("fooHeadersSchema");
    expect(declarations[0].isExported).toBe(true);
    expect(declarations[0].hasTypeExport).toBe(true);

    expect(declarations[1].name).toBe("fooServerHeadersSchema");
    expect(declarations[1].isExported).toBe(true);
    expect(declarations[1].hasTypeExport).toBe(true);

    /* Directly exported schemas */
    expect(declarations[2].name).toBe("fooParsedParams");
    expect(declarations[2].isExported).toBe(true);
    expect(declarations[2].hasTypeExport).toBe(false);

    /* Type aliases with different names */
    expect(typeAliases).toHaveLength(2);
    expect(typeAliases[0].name).toBe("fooParsedParamsType");
    expect(typeAliases[0].referencedConst).toBe("fooParsedParams");
    expect(typeAliases[1].name).toBe("fooServerParsedParamsType");
    expect(typeAliases[1].referencedConst).toBe("fooServerParsedParams");
  });
});
