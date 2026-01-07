import type { SchemaObject } from "openapi3-ts/oas31";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
  generateGetterCode,
} from "@apical-ts/core-utils";

// Mock zodSchemaToCode
vi.mock("@apical-ts/core-utils", async () => {
  const actual = await vi.importActual<typeof import("@apical-ts/core-utils")>(
    "@apical-ts/core-utils",
  );
  return {
    ...actual,
    zodSchemaToCode: vi.fn(),
  };
});

// Import after mock
const { zodSchemaToCode } = await import("@apical-ts/core-utils");

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
      expect(result.content).toContain("import * as z from 'zod';");
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
          another: { $ref: "#/components/schemas/Profile" },
          self: { $ref: "#/components/schemas/User" },
        },
        type: "object",
      };

      const result = await generateSchemaFile("User", schema);

      // Should import Profile but not import User (itself)
      expect(result.content).toMatch(/import \{ Profile \}/);
      expect(result.content).not.toMatch(/import.*User.*from/);
    });

    it("should generate extensible enum schema", async () => {
      const schema: SchemaObject = {
        enum: ["value1", "value2"],
        type: "string",
      };

      // Note: This test uses the real zodSchemaToCode implementation
      // which generates z.enum() for enums without x-extensible-enum
      const result = await generateSchemaFile("Status", schema);

      // Regular enum generates z.enum() and z.infer type
      expect(result.content).toContain('z.enum(["value1", "value2"])');
      expect(result.content).toContain("export type Status");
      expect(result.content).toContain("export const Status");
    });

    it("should handle extensible enum with complex values", async () => {
      const schema: SchemaObject = {
        enum: ["complex-value", "another_value", "123"],
        type: "string",
      };

      // Note: This test uses the real zodSchemaToCode implementation
      const result = await generateSchemaFile("Type", schema);

      // Regular enum with complex values
      expect(result.content).toContain(
        'z.enum(["complex-value", "another_value", "123"])',
      );
      expect(result.content).toContain("export type Type");
      expect(result.content).toContain("export const Type");
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

  describe("circular reference type annotations", () => {
    it("should generate getters with proper TypeScript return type annotations for arrays", () => {
      const arraySchema: SchemaObject = {
        type: "array",
        items: {
          $ref: "#/Category",
        },
      };

      const result = generateGetterCode(
        "subcategories",
        arraySchema,
        "Category",
        false,
      );

      expect(result).toContain(
        'get "subcategories"(): z.ZodOptional<z.ZodArray<typeof Category>>',
      );
      expect(result).toContain("return z.array(Category).optional()");
    });

    it("should generate getters with proper TypeScript return type annotations for direct references", () => {
      const refSchema = {
        $ref: "#/Category",
      };

      const result = generateGetterCode("parent", refSchema, "Category", true);

      expect(result).toContain('get "parent"(): typeof Category');
      expect(result).toContain("return Category");
    });

    it("should generate proper type annotations for required vs optional fields", () => {
      const refSchema = {
        $ref: "#/Category",
      };

      const requiredResult = generateGetterCode(
        "parent",
        refSchema,
        "Category",
        true,
      );
      const optionalResult = generateGetterCode(
        "parent",
        refSchema,
        "Category",
        false,
      );

      expect(requiredResult).toContain("(): typeof Category");
      expect(optionalResult).toContain("(): z.ZodOptional<typeof Category>");
    });
  });
});
