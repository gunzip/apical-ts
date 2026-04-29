import { describe, expect, it } from "vitest";

import { addDefaultValue } from "../../src/schema-generator/utils.js";

describe("addDefaultValue coercion", () => {
  describe("boolean schema", () => {
    it("coerces string 'false' to boolean false", () => {
      const result = addDefaultValue("z.boolean()", "false", {
        schemaType: "boolean",
      });
      expect(result).toBe("z.boolean().default(false)");
    });

    it("coerces string 'true' to boolean true", () => {
      const result = addDefaultValue("z.boolean()", "true", {
        schemaType: "boolean",
      });
      expect(result).toBe("z.boolean().default(true)");
    });

    it("coerces case-insensitively ('True', 'FALSE')", () => {
      expect(
        addDefaultValue("z.boolean()", "True", { schemaType: "boolean" }),
      ).toBe("z.boolean().default(true)");
      expect(
        addDefaultValue("z.boolean()", "FALSE", { schemaType: "boolean" }),
      ).toBe("z.boolean().default(false)");
    });

    it("drops default for invalid boolean string", () => {
      const result = addDefaultValue("z.boolean()", "yes", {
        schemaType: "boolean",
      });
      expect(result).toBe("z.boolean()");
    });
  });

  describe("number schema", () => {
    it("coerces string '42' to number 42", () => {
      const result = addDefaultValue("z.number()", "42", {
        schemaType: "number",
      });
      expect(result).toBe("z.number().default(42)");
    });

    it("drops default for non-numeric string 'abc'", () => {
      const result = addDefaultValue("z.number()", "abc", {
        schemaType: "number",
      });
      expect(result).toBe("z.number()");
    });
  });

  describe("array schema", () => {
    it("drops scalar default '*' for array type", () => {
      const result = addDefaultValue("z.array(z.string())", "*", {
        schemaType: "array",
      });
      expect(result).toBe("z.array(z.string())");
    });

    it("keeps array default as-is for string arrays", () => {
      // ["true"] stays ["true"] — no boolean coercion for string item type
      const result = addDefaultValue("z.array(z.string())", ["true"], {
        itemSchemaType: "string",
        schemaType: "array",
      });
      expect(result).toBe('z.array(z.string()).default(["true"])');
    });

    it("coerces string elements to booleans for boolean arrays", () => {
      const result = addDefaultValue("z.array(z.boolean())", ["true"], {
        itemSchemaType: "boolean",
        schemaType: "array",
      });
      expect(result).toBe("z.array(z.boolean()).default([true])");
    });

    it("keeps valid array defaults unchanged", () => {
      const result = addDefaultValue("z.array(z.number())", [1, 2, 3], {
        schemaType: "array",
      });
      expect(result).toBe("z.array(z.number()).default([1,2,3])");
    });
  });

  describe("bigint schema", () => {
    it("emits bigint default for valid numeric value", () => {
      const result = addDefaultValue("z.coerce.bigint()", 0, { bigint: true });
      expect(result).toBe("z.coerce.bigint().default(0n)");
    });

    it("drops default for invalid bigint string", () => {
      const result = addDefaultValue("z.coerce.bigint()", "abc", {
        bigint: true,
      });
      expect(result).toBe("z.coerce.bigint()");
    });
  });
});
