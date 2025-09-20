import { describe, expect, it } from "vitest";
import { generate } from "../../src/core-generator/index.js";
import { promises as fs } from "fs";
import path from "path";

describe("core-generator response reference resolution", () => {
  it("should generate response schemas for $ref responses", async () => {
    const testSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/catalog": {
          get: {
            operationId: "getCatalog",
            responses: {
              "200": {
                $ref: "#/components/responses/ListCatalogs",
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Catalog: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
        },
        responses: {
          ListCatalogs: {
            description: "List of catalogs",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Catalog",
                  },
                },
              },
            },
          },
        },
      },
    };

    const testDir = `/tmp/test-response-refs-${Date.now()}`;
    const inputFile = path.join(testDir, "test.json");

    try {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(inputFile, JSON.stringify(testSpec, null, 2));

      await generate({
        input: inputFile,
        output: testDir,
        generateClient: true,
        generateServer: true,
      });

      // Check that the response schema files were generated
      const clientResponseFile = path.join(
        testDir,
        "schemas",
        "GetCatalog200Response.ts",
      );
      const serverResponseFile = path.join(
        testDir,
        "schemas",
        "GetCatalog200ResponseStrict.ts",
      );

      const [clientExists, serverExists] = await Promise.all([
        fs.access(clientResponseFile).then(() => true, () => false),
        fs.access(serverResponseFile).then(() => true, () => false),
      ]);

      expect(clientExists).toBe(true);
      expect(serverExists).toBe(true);

      // Check the content of the generated response schema
      const clientContent = await fs.readFile(clientResponseFile, "utf-8");
      expect(clientContent).toContain("GetCatalog200Response");
      expect(clientContent).toContain("z.array(");

      const serverContent = await fs.readFile(serverResponseFile, "utf-8");
      expect(serverContent).toContain("GetCatalog200ResponseStrict");
      expect(serverContent).toContain("z.array(");

      // Verify that client and server files can import the response schemas
      const clientFile = path.join(testDir, "client", "getCatalog.ts");
      const serverFile = path.join(testDir, "server", "getCatalog.ts");

      const [clientFileContent, serverFileContent] = await Promise.all([
        fs.readFile(clientFile, "utf-8"),
        fs.readFile(serverFile, "utf-8"),
      ]);

      expect(clientFileContent).toContain(
        'import { GetCatalog200Response } from "../schemas/GetCatalog200Response.js"',
      );
      expect(serverFileContent).toContain(
        'import { GetCatalog200ResponseStrict } from "../schemas/GetCatalog200ResponseStrict.js"',
      );
    } finally {
      // Clean up test directory
      await fs.rmdir(testDir, { recursive: true }).catch(() => {
        // Ignore cleanup errors
      });
    }
  });

  it("should handle unresolvable response references gracefully", async () => {
    const testSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            operationId: "getTest",
            responses: {
              "200": {
                $ref: "#/components/responses/NonExistentResponse",
              },
            },
          },
        },
      },
      components: {
        responses: {
          // NonExistentResponse is referenced but not defined
        },
      },
    };

    const testDir = `/tmp/test-unresolvable-${Date.now()}`;
    const inputFile = path.join(testDir, "test.json");

    try {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(inputFile, JSON.stringify(testSpec, null, 2));

      // This should not throw an error, but should warn and skip the unresolvable reference
      await generate({
        input: inputFile,
        output: testDir,
        generateClient: true,
        generateServer: true,
      });

      // Verify that no response schema files were generated for the unresolvable reference
      const responseFiles = await fs
        .readdir(path.join(testDir, "schemas"))
        .catch(() => []);

      const responseSchemaFiles = responseFiles.filter((file) =>
        file.includes("GetTest200Response"),
      );
      expect(responseSchemaFiles).toHaveLength(0);
    } finally {
      // Clean up test directory
      await fs.rmdir(testDir, { recursive: true }).catch(() => {
        // Ignore cleanup errors
      });
    }
  });
});