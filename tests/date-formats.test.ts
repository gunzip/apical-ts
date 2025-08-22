import { describe, it, expect } from "vitest";
import { zodSchemaToCode } from "../src/schema-generator";
import type { SchemaObject } from "openapi3-ts/oas31";

describe("Date format handling", () => {
  it("should generate z.iso.date() for format: date", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "date",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.date()");
  });

  it("should generate z.iso.datetime() for format: date-time", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "date-time",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.datetime()");
  });

  it("should generate z.iso.time() for format: time", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "time",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.time()");
  });

  it("should generate z.iso.duration() for format: duration", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "duration",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.iso.duration()");
  });

  it("should handle date format with default value", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "date",
      default: "2023-12-25",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.iso.date().default("2023-12-25")');
  });

  it("should handle datetime format with default value", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "date-time",
      default: "2023-12-25T10:30:00Z",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.iso.datetime().default("2023-12-25T10:30:00Z")'
    );
  });

  it("should handle existing email format correctly", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "email",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.email()");
  });

  it("should handle existing uuid format correctly", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "uuid",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.uuid()");
  });

  it("should handle existing uri format correctly", () => {
    const schema: SchemaObject = {
      type: "string",
      format: "uri",
    };

    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.url()");
  });
});
