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

  it("should ignore multi-file refs by default", () => {
    expect(
      parseSchemaReference("./models/pets.yaml#/components/schemas/Dog"),
    ).toBeUndefined();
  });

  it("should parse multi-file component schema references when enabled", () => {
    const result = parseSchemaReference(
      "./models/pets.yaml#/components/schemas/Dog",
      { allowExternal: true },
    );

    expect(result).toEqual({
      identifierName: "Dog",
      originalName: "Dog",
    });
  });

  it("should parse multi-file short-form schema references when enabled", () => {
    const result = parseSchemaReference("../shared/types.yaml#/Cat", {
      allowExternal: true,
    });

    expect(result).toEqual({
      identifierName: "Cat",
      originalName: "Cat",
    });
  });

  it("should parse multi-file references with special characters when enabled", () => {
    const result = parseSchemaReference(
      "https://example.com/schemas.yaml#/components/schemas/my_schema",
      { allowExternal: true },
    );

    expect(result).toEqual({
      identifierName: "mySchema",
      originalName: "my_schema",
    });
  });
});
