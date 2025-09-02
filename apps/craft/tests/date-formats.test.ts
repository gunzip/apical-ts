import type { SchemaObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { zodSchemaToCode } from "../src/schema-generator";

describe("Date format handling", () => {
  it("should generate z.iso.date() for format: date", () => {
    const schema: SchemaObject = {
      format: "date",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.date()");
  });

  it("should generate z.iso.datetime() for format: date-time", () => {
    const schema: SchemaObject = {
      format: "date-time",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.datetime({ offset: true, local: true })");
  });

  it("should generate z.iso.time() for format: time", () => {
    const schema: SchemaObject = {
      format: "time",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.time()");
  });

  it("should generate z.iso.duration() for format: duration", () => {
    const schema: SchemaObject = {
      format: "duration",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.duration()");
  });

  it("should handle date format with default value", () => {
    const schema: SchemaObject = {
      default: "2023-12-25",
      format: "date",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.iso.date().default("2023-12-25")');
  });

  it("should handle datetime format with default value", () => {
    const schema: SchemaObject = {
      default: "2023-12-25T10:30:00Z",
      format: "date-time",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.iso.datetime({ offset: true, local: true }).default("2023-12-25T10:30:00Z")',
    );
  });

  it("should handle existing email format correctly", () => {
    const schema: SchemaObject = {
      format: "email",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.email()");
  });

  it("should handle existing uuid format correctly", () => {
    const schema: SchemaObject = {
      format: "uuid",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.uuid()");
  });

  it("should handle existing uri format correctly", () => {
    const schema: SchemaObject = {
      format: "uri",
      type: "string",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.url()");
  });
});
