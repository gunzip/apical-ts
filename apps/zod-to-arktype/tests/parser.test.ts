/*
 * Unit tests for Zod schema parser
 */

import { describe, expect, it } from "vitest";
import { parseZodSchemaContent } from "../src/parser.js";

describe("parseZodSchemaContent", () => {
  it("should parse simple schema with export and type", () => {
    const content = `import { z } from 'zod';

export const SimpleDefinition = z.object({"id": z.string()});
export type SimpleDefinition = z.infer<typeof SimpleDefinition>;`;

    const result = parseZodSchemaContent(content, "test.ts");
    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0]?.name).toBe("SimpleDefinition");
    expect(result.schemas[0]?.definition).toBe('z.object({"id": z.string()})');
  });

  it("should extract imports", () => {
    const content = `import { z } from 'zod';
import { Message } from "./Message.js";
import { PaginationResponse } from "./PaginationResponse.js";

export const TestSchema = z.object({});
export type TestSchema = z.infer<typeof TestSchema>;`;

    const result = parseZodSchemaContent(content, "test.ts");

    expect(result.imports).toHaveLength(3);
    expect(result.imports[0].names).toContain("z");
    expect(result.imports[1].names).toContain("Message");
    expect(result.imports[2].names).toContain("PaginationResponse");
  });

  it("should extract JSDoc comments", () => {
    const content = `import { z } from 'zod';

/**
 * Describes an object with a ref import
 */
export const AnObjectWithRefImport = z.object({"prop1": SimpleDefinition});
export type AnObjectWithRefImport = z.infer<typeof AnObjectWithRefImport>;`;

    const result = parseZodSchemaContent(content, "test.ts");
    const schema = result.schemas.find(
      (s) => s.name === "AnObjectWithRefImport",
    );
    expect(schema?.comments ?? "").toContain(
      "Describes an object with a ref import",
    );
  });

  it("should handle single-line complete schema definitions", () => {
    const content = `import { z } from 'zod';

export const ComplexSchema = z.object({"id": z.string(), "name": z.string()});
export type ComplexSchema = z.infer<typeof ComplexSchema>;`;

    const result = parseZodSchemaContent(content, "test.ts");
    expect(result.schemas[0]?.definition ?? "").toContain("z.object({");
    expect(result.schemas[0]?.definition ?? "").toContain("z.string()");
  });

  it("should handle imports with multiple names", () => {
    const content = `import { z } from 'zod';
import { Message, User, Post } from "./schemas.js";

export const TestSchema = z.object({});
export type TestSchema = z.infer<typeof TestSchema>;`;

    const result = parseZodSchemaContent(content, "test.ts");

    const schemasImport = result.imports.find(
      (imp) => imp.source === "./schemas.js",
    );
    expect(schemasImport).toBeDefined();
    expect(schemasImport?.names).toContain("Message");
    expect(schemasImport?.names).toContain("User");
    expect(schemasImport?.names).toContain("Post");
  });

  it("should throw error when no schema definition found", () => {
    const content = `import { z } from 'zod';`;

    expect(() => {
      parseZodSchemaContent(content, "test.ts");
    }).toThrow("No schema definition found");
  });

  it("should handle complex allOf schemas", () => {
    const content = `import { z } from 'zod';
import { Message } from "./Message.js";

export const AllOfTest = z.object({...z.object({"items": z.array(Message).optional()}).shape});
export type AllOfTest = z.infer<typeof AllOfTest>;`;

    const result = parseZodSchemaContent(content, "test.ts");
    expect(result.schemas[0]?.name).toBe("AllOfTest");
    expect(result.schemas[0]?.definition ?? "").toContain("z.object({");
    expect(result.schemas[0]?.definition ?? "").toContain("...z.object");
  });
});
