import { promises as fs } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  generateFallbackSchemaContent,
  generateSchemas,
} from "../../src/core-generator/schema-generation-coordinator.js";

describe("core-generator schema-generation-coordinator", () => {
  describe("generateFallbackSchemaContent", () => {
    it("should preserve true boolean component schema semantics", () => {
      const result = generateFallbackSchemaContent("AllowAnything", true);

      expect(result).toContain("export const AllowAnything = z.unknown();");
      expect(result).not.toContain("z.never()");
    });

    it("should preserve false boolean component schema semantics", () => {
      const result = generateFallbackSchemaContent("AllowNothing", false);

      expect(result).toContain("export const AllowNothing = z.never();");
      expect(result).not.toContain("z.unknown()");
    });
  });

  describe("generateSchemas", () => {
    it("bundles operation parameter schemas into a single module", async () => {
      const outputDir = path.join(
        process.cwd(),
        "tests",
        ".schema-generation-coordinator-output",
      );

      await fs.rm(outputDir, { force: true, recursive: true });

      try {
        await generateSchemas(
          {
            info: {
              title: "parameter bundle test",
              version: "1.0.0",
            },
            openapi: "3.1.0",
            paths: {
              "/pets": {
                get: {
                  operationId: "listPets",
                  parameters: [
                    {
                      in: "query",
                      name: "status",
                      schema: { type: "string" },
                    },
                  ],
                  responses: {
                    200: { description: "OK" },
                  },
                },
              },
              "/pets/{petId}": {
                get: {
                  operationId: "getPetById",
                  parameters: [
                    {
                      in: "path",
                      name: "petId",
                      required: true,
                      schema: { $ref: "#/components/schemas/PetId" },
                    },
                  ],
                  responses: {
                    200: { description: "OK" },
                  },
                },
              },
              "/ping": {
                get: {
                  operationId: "ping",
                  responses: {
                    200: { description: "OK" },
                  },
                },
              },
            },
            components: {
              schemas: {
                PetId: {
                  type: "string",
                },
              },
            },
          },
          outputDir,
          1,
          false,
          "strip",
        );

        const schemasDir = path.join(outputDir, "schemas");
        const files = await fs.readdir(schemasDir);
        const bundledParameters = await fs.readFile(
          path.join(schemasDir, "parameters.ts"),
          "utf-8",
        );
        const indexContent = await fs.readFile(
          path.join(schemasDir, "index.ts"),
          "utf-8",
        );

        expect(files).toContain("parameters.ts");
        expect(files).not.toContain("listPetsParameters.ts");
        expect(files).not.toContain("getPetByIdParameters.ts");
        expect(files).not.toContain("pingParameters.ts");

        expect(bundledParameters).toContain(`import * as z from "zod";`);
        expect(bundledParameters).toContain(
          `import { PetId } from "./PetId.js";`,
        );
        expect(bundledParameters).toContain("export { listPetsQuerySchema };");
        expect(bundledParameters).toContain("export { getPetByIdPathSchema };");
        expect(bundledParameters).toContain(
          "export const pingParsedParams = z.object({});",
        );
        expect(bundledParameters).toContain(
          "export const pingServerParsedParams = z.object({});",
        );

        expect(indexContent).toContain(`} from "./parameters.js";`);
        expect(indexContent).toContain("listPetsQuerySchema");
        expect(indexContent).toContain("getPetByIdPathSchema");
      } finally {
        await fs.rm(outputDir, { force: true, recursive: true });
      }
    });
  });
});
