import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  type SchemaFileResult,
} from "../../src/schema-generator/file-generators.js";
import type { SchemaObject } from "openapi3-ts/oas31";
import { format } from "prettier";
import { zodSchemaToCode } from "../../src/schema-generator/schema-converter.js";

// Mock prettier
vi.mock("prettier", () => ({
  format: vi.fn(),
}));

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
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ name: z.string() })",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\nexport const User = z.object({ name: z.string() });\nexport type User = z.infer<typeof User>;\n`
      );

      const result = await generateSchemaFile("User", schema);

      expect(result.fileName).toBe("User.ts");
      expect(result.content).toContain("export const User");
      expect(result.content).toContain("export type User");
      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("import { z } from 'zod';"),
        { parser: "typescript" }
      );
    });

    it("should generate schema file with description", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * User entity schema\n */\nexport const User = z.string();\nexport type User = z.infer<typeof User>;\n`
      );

      const result = await generateSchemaFile("User", schema, "User entity schema");

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("/**\n * User entity schema\n */"),
        { parser: "typescript" }
      );
    });

    it("should generate schema file with multiline description", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * User entity\n * Contains user information\n */\nexport const User = z.string();\nexport type User = z.infer<typeof User>;\n`
      );

      const result = await generateSchemaFile(
        "User",
        schema,
        "User entity\nContains user information"
      );

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("/**\n * User entity\n * Contains user information\n */"),
        { parser: "typescript" }
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

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * Description with *\\/ delimiter\n */\nexport const User = z.string();\nexport type User = z.infer<typeof User>;\n`
      );

      const result = await generateSchemaFile("User", schema, "Description with */ delimiter");

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("Description with *\\/ delimiter"),
        { parser: "typescript" }
      );
    });

    it("should generate schema file with imports", async () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
        },
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ user: User })",
        imports: new Set(["User"]),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\nimport { User } from "./User.js";\n\nexport const Profile = z.object({ user: User });\nexport type Profile = z.infer<typeof Profile>;\n`
      );

      const result = await generateSchemaFile("Profile", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining(`import { User } from "./User.js";`),
        { parser: "typescript" }
      );
    });

    it("should not import itself", async () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          self: { $ref: "#/components/schemas/User" },
        },
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ self: User })",
        imports: new Set(["User", "Profile"]),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\nimport { Profile } from "./Profile.js";\n\nexport const User = z.object({ self: User });\nexport type User = z.infer<typeof User>;\n`
      );

      const result = await generateSchemaFile("User", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringMatching(/import \{ Profile \}/),
        { parser: "typescript" }
      );
      expect(format).toHaveBeenCalledWith(
        expect.not.stringMatching(/import \{ User \}/),
        { parser: "typescript" }
      );
    });

    it("should generate extensible enum schema", async () => {
      const schema: SchemaObject = {
        type: "string",
        enum: ["value1", "value2"],
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.union([z.literal('value1'), z.literal('value2'), z.string()])",
        imports: new Set(),
        extensibleEnumValues: ["value1", "value2"],
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\nexport const Status = z.union([z.literal('value1'), z.literal('value2'), z.string()]);\nexport type Status = "value1" | "value2" | (string & {});\n`
      );

      const result = await generateSchemaFile("Status", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining('export type Status = "value1" | "value2" | (string & {});'),
        { parser: "typescript" }
      );
    });

    it("should handle extensible enum with complex values", async () => {
      const schema: SchemaObject = {
        type: "string",
        enum: ["complex-value", "another_value", "123"],
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.union([z.literal('complex-value'), z.literal('another_value'), z.literal('123'), z.string()])",
        imports: new Set(),
        extensibleEnumValues: ["complex-value", "another_value", "123"],
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\nexport const Type = z.union([z.literal('complex-value'), z.literal('another_value'), z.literal('123'), z.string()]);\nexport type Type = "complex-value" | "another_value" | "123" | (string & {});\n`
      );

      const result = await generateSchemaFile("Type", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining('"complex-value" | "another_value" | "123"'),
        { parser: "typescript" }
      );
    });

    it("should handle multiple imports", async () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          role: { $ref: "#/components/schemas/Role" },
        },
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ user: User, role: Role })",
        imports: new Set(["User", "Role"]),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\nimport { User } from "./User.js";\nimport { Role } from "./Role.js";\n\nexport const Profile = z.object({ user: User, role: Role });\nexport type Profile = z.infer<typeof Profile>;\n`
      );

      const result = await generateSchemaFile("Profile", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringMatching(/import \{ User \} from "\.\/User\.js";[\s\S]*import \{ Role \} from "\.\/Role\.js";/),
        { parser: "typescript" }
      );
    });
  });

  describe("generateRequestSchemaFile", () => {
    it("should generate request schema file with proper naming and description", async () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          email: { type: "string" },
        },
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ email: z.string() })",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * Request schema for createUser operation\n */\nexport const CreateUserRequest = z.object({ email: z.string() });\nexport type CreateUserRequest = z.infer<typeof CreateUserRequest>;\n`
      );

      const result = await generateRequestSchemaFile("createUserRequest", schema);

      expect(result.fileName).toBe("CreateUserRequest.ts");
      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("Request schema for createUser operation"),
        { parser: "typescript" }
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

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * Request schema for test operation\n */\nexport const TestRequest = z.string();\nexport type TestRequest = z.infer<typeof TestRequest>;\n`
      );

      const result = await generateRequestSchemaFile("testRequest", schema);

      expect(result.fileName).toBe("TestRequest.ts");
    });
  });

  describe("generateResponseSchemaFile", () => {
    it("should generate response schema file with proper description", async () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.object({ id: z.string() })",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * Response schema for CreateUser operation\n */\nexport const CreateUser200Response = z.object({ id: z.string() });\nexport type CreateUser200Response = z.infer<typeof CreateUser200Response>;\n`
      );

      const result = await generateResponseSchemaFile("CreateUser200Response", schema);

      expect(result.fileName).toBe("CreateUser200Response.ts");
      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("Response schema for CreateUser200"),
        { parser: "typescript" }
      );
    });

    it("should handle response names without Response suffix", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * Response schema for User operation\n */\nexport const User = z.string();\nexport type User = z.infer<typeof User>;\n`
      );

      const result = await generateResponseSchemaFile("User", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("Response schema for User"),
        { parser: "typescript" }
      );
    });

    it("should handle numeric response codes in names", async () => {
      const schema: SchemaObject = {
        type: "string",
      };

      vi.mocked(zodSchemaToCode).mockReturnValue({
        code: "z.string()",
        imports: new Set(),
      });

      vi.mocked(format).mockResolvedValue(
        `import { z } from "zod";\n\n/**\n * Response schema for GetUser operation\n */\nexport const GetUser404Response = z.string();\nexport type GetUser404Response = z.infer<typeof GetUser404Response>;\n`
      );

      const result = await generateResponseSchemaFile("GetUser404Response", schema);

      expect(format).toHaveBeenCalledWith(
        expect.stringContaining("Response schema for GetUser404"),
        { parser: "typescript" }
      );
    });
  });
});