import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

// Import the generated schemas that demonstrate collision detection
import { Catalog } from "../generated/schemas/Catalog.js";
import { CatalogMeta } from "../generated/schemas/CatalogMeta.js";
import { catalog2 } from "../generated/schemas/catalog2.js";
import { catalogmeta2 } from "../generated/schemas/catalogmeta2.js";

describe("schema sanitization collision detection", () => {
  it("should have renamed schemas to avoid case-sensitivity conflicts in the generated client", async () => {
    // Test that the collision detection has worked by verifying the existence and structure of renamed schemas

    // Verify that the renamed schema files exist in the generated directory
    const schemasDir = path.resolve(
      __dirname,
      "../generated/schemas",
    );
    const schemaFiles = await fs.readdir(schemasDir);

    // Check that all the expected collision-resolved files exist
    expect(schemaFiles).toContain("Catalog.ts"); // Original Catalog schema
    expect(schemaFiles).toContain("catalog2.ts"); // _catalog renamed to avoid collision
    expect(schemaFiles).toContain("CatalogMeta.ts"); // Original CatalogMeta schema
    expect(schemaFiles).toContain("catalogmeta2.ts"); // _catalogmeta renamed to avoid collision

    // Verify that the imported schemas are valid Zod schemas
    expect(Catalog).toBeDefined();
    expect(CatalogMeta).toBeDefined();
    expect(catalog2).toBeDefined();
    expect(catalogmeta2).toBeDefined();

    // Verify that the renamed schemas can be used for validation
    const validCatalogMeta = {
      url: "https://example.com",
      name: "test123",
      description: "Test catalog",
    };

    const catalogMetaResult = catalogmeta2.safeParse(validCatalogMeta);
    expect(catalogMetaResult.success).toBe(true);

    // Verify the schema structure by checking the file contents
    const catalogContent = await fs.readFile(
      path.join(schemasDir, "Catalog.ts"),
      "utf-8",
    );
    expect(catalogContent).toContain("export const Catalog");
    expect(catalogContent).toContain("catalog2"); // Should reference the renamed schema

    const catalog2Content = await fs.readFile(
      path.join(schemasDir, "catalog2.ts"),
      "utf-8",
    );
    expect(catalog2Content).toContain("export const catalog2");
    expect(catalog2Content).toContain("catalogmeta2"); // Should reference the renamed catalogmeta2

    const catalogMetaContent = await fs.readFile(
      path.join(schemasDir, "CatalogMeta.ts"),
      "utf-8",
    );
    expect(catalogMetaContent).toContain("export const CatalogMeta");
    expect(catalogMetaContent).toContain("catalogmeta2"); // Should reference the renamed schema
  });

  it("should verify collision detection works correctly with actual schema validation", () => {
    // Test that the collision-renamed schemas are functionally correct and can be used for validation

    // Test catalogmeta2 schema (the renamed _catalogmeta)
    const validCatalogMeta = {
      url: "https://example.com/catalog",
      name: "testCatalog123",
      description: "A test catalog description",
    };

    const invalidCatalogMeta = {
      url: "not-a-url", // Invalid URL
      name: "test catalog", // Invalid name (contains space, should only be alphanumeric)
    };

    // Valid data should pass validation
    const validResult = catalogmeta2.safeParse(validCatalogMeta);
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.url).toBe("https://example.com/catalog");
      expect(validResult.data.name).toBe("testCatalog123");
      expect(validResult.data.description).toBe("A test catalog description");
    }

    // Invalid data should fail validation
    const invalidResult = catalogmeta2.safeParse(invalidCatalogMeta);
    expect(invalidResult.success).toBe(false);

    // Test that the schemas are properly linked - catalog2 should reference catalogmeta2
    // This validates that the $ref updates worked correctly during collision resolution
    expect(catalog2).toBeDefined();
    expect(Catalog).toBeDefined();
    expect(CatalogMeta).toBeDefined();

    // The collision detection should ensure these schemas work together
    // catalog2 and catalogmeta2 are distinct schemas; this test checks that their validation results are consistent for the given test data.
    const testData = { url: "https://test.com" };
    const catalog2Result = catalog2.safeParse(testData);
    const catalogmeta2Result = catalogmeta2.safeParse(testData);

    expect(catalog2Result.success).toBe(catalogmeta2Result.success);
  });
});
