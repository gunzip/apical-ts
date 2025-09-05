import type { SchemaObject } from "openapi3-ts/oas31";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
  type SchemaFileResult,
} from "../../src/schema-generator/file-generators.js";
import { zodSchemaToCode } from "../../src/schema-generator/schema-converter.js";

// Mock schema-converter
vi.mock("../../src/schema-generator/schema-converter.js", () => ({
  zodSchemaToCode: vi.fn(),
}));

describe("schema-generator file-generators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSchemaFile", () => {
    it("should generate basic schema file", async () => {
      const schema: SchemaObject = {
        properties: {
          name: { type: "string" },
        },
        type: "object",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ name: z.string() })",
        imports: new Set(),
      });

      const result = await generateSchemaFile("User", schema);

      expect(result.fileName).toBe("User.ts");
      expect(result.content).toContain("export const User");
      expect(result.content).toContain("export type User");
      expect(result.content).toContain("import { z } from 'zod';");
    });

    it("should generate schema file with description", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      const result = await generateSchemaFile(
        "User",
        schema,
        "User entity schema",
      );

      expect(result.content).toContain("/**\n * User entity schema\n */");
    });

    it("should generate schema file with multiline description", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      const result = await generateSchemaFile(
        "User",
        schema,
        "User entity\nContains user information",
      );

      expect(result.content).toContain(
        "/**\n * User entity\n * Contains user information\n */",
      );
    });

    it("should escape comment delimiters in description", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      const result = await generateSchemaFile(
        "User",
        schema,
        "Description with */ delimiter",
      );

      expect(result.content).toContain("Description with *\\/ delimiter");
    });

    it("should generate schema file with imports", async () => {
      const schema: SchemaObject = {
        properties: {
          user: { $ref: "#/components/schemas/User" },
        },
        type: "object",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ user: User })",
        imports: new Set(["User"]),
      });

      const result = await generateSchemaFile("Profile", schema);

      expect(result.content).toContain(`import { User } from "./User.js";`);
    });

    it("should not import itself", async () => {
      const schema: SchemaObject = {
        properties: {
          self: { $ref: "#/components/schemas/User" },
        },
        type: "object",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ self: User })",
        imports: new Set(["Profile", "User"]),
      });

      const result = await generateSchemaFile("User", schema);

      expect(result.content).toMatch(/import \{ Profile \}/);
      expect(result.content).not.toMatch(/import \{ User \}/);
    });

    it("should generate extensible enum schema", async () => {
      const schema: SchemaObject = {
        enum: ["value1", "value2"],
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.union([z.literal('value1'), z.literal('value2'), z.string()])",
        extensibleEnumValues: ["value1", "value2"],
        imports: new Set(),
      });

      const result = await generateSchemaFile("Status", schema);

      expect(result.content).toContain(
        'export type Status = "value1" | "value2" | (string & {});',
      );
    });

    it("should handle extensible enum with complex values", async () => {
      const schema: SchemaObject = {
        enum: ["complex-value", "another_value", "123"],
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.union([z.literal('complex-value'), z.literal('another_value'), z.literal('123'), z.string()])",
        extensibleEnumValues: ["complex-value", "another_value", "123"],
        imports: new Set(),
      });

      const result = await generateSchemaFile("Type", schema);

      expect(result.content).toContain(
        '"complex-value" | "another_value" | "123"',
      );
    });

    it("should handle multiple imports", async () => {
      const schema: SchemaObject = {
        properties: {
          role: { $ref: "#/components/schemas/Role" },
          user: { $ref: "#/components/schemas/User" },
        },
        type: "object",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ user: User, role: Role })",
        imports: new Set(["Role", "User"]),
      });

      const result = await generateSchemaFile("Profile", schema);

      expect(result.content).toMatch(/import \{ Role \} from "\.\/Role\.js";/);
      expect(result.content).toMatch(/import \{ User \} from "\.\/User\.js";/);
    });
  });

  describe("generateRequestSchemaFile", () => {
    it("should generate request schema file with proper naming and description", async () => {
      const schema: SchemaObject = {
        properties: {
          email: { type: "string" },
        },
        type: "object",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ email: z.string() })",
        imports: new Set(),
      });

      const result = await generateRequestSchemaFile(
        "createUserRequest",
        schema,
      );

      expect(result.fileName).toBe("CreateUserRequest.ts");
      expect(result.content).toContain(
        "Request schema for createUser operation",
      );
    });

    it("should capitalize first letter of request schema name", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      const result = await generateRequestSchemaFile("testRequest", schema);

      expect(result.fileName).toBe("TestRequest.ts");
    });
  });

  describe("generateResponseSchemaFile", () => {
    it("should generate response schema file with proper description", async () => {
      const schema: SchemaObject = {
        properties: {
          id: { type: "string" },
        },
        type: "object",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ id: z.string() })",
        imports: new Set(),
      });

      const result = await generateResponseSchemaFile(
        "CreateUser200Response",
        schema,
      );

      expect(result.fileName).toBe("CreateUser200Response.ts");
      expect(result.content).toContain("Response schema for CreateUser200");
    });

    it("should handle response names without Response suffix", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      const result = await generateResponseSchemaFile("User", schema);

      expect(result.content).toContain("Response schema for User");
    });

    it("should handle numeric response codes in names", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      const result = await generateResponseSchemaFile(
        "GetUser404Response",
        schema,
      );

      expect(result.content).toContain("Response schema for GetUser404");
    });
  });
});
