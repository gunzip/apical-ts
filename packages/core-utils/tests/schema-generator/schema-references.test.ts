import { describe, expect, it } from "vitest";

import {
  getSchemaNameFromReference,
  parseSchemaReference,
} from "../../src/schema-generator/schema-references.js";

describe("schema-references", () => {
  it("should parse component schema references", () => {
    const result = parseSchemaReference("#/components/schemas/data_center");

    expect(result).toEqual({
      identifierName: "dataCenter",
      originalName: "data_center",
    });
  });

  it("should parse short-form schema references", () => {
    const result = parseSchemaReference("#/Category");

    expect(result).toEqual({
      identifierName: "Category",
      originalName: "Category",
    });
  });

  it("should ignore non-schema references", () => {
    expect(parseSchemaReference("#/paths/users")).toBeUndefined();
    expect(getSchemaNameFromReference("not-a-ref")).toBeUndefined();
  });
});
