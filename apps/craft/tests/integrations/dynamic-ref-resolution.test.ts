import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generate } from "../../src/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const recursiveFixture = join(__dirname, "fixtures/dynamic-ref-recursive.yaml");
const paginationFixture = join(
  __dirname,
  "fixtures/dynamic-ref-pagination.yaml",
);
const nestedFixture = join(__dirname, "fixtures/dynamic-ref-nested.yaml");

const outputDir = join(__dirname, "../../tmp/dynamic-ref");

describe("$dynamicRef / $dynamicAnchor resolution", () => {
  beforeEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  afterEach(async () => {
    await fs.rm(outputDir, { force: true, recursive: true });
  });

  describe("recursive category tree", () => {
    it("generates BaseCategory as a recursive schema", async () => {
      await generate({
        generateClient: false,
        input: recursiveFixture,
        output: outputDir,
      });

      const content = await readSchema("BaseCategory.ts");

      /* Should reference itself recursively, not z.unknown() */
      expect(content).not.toContain("z.unknown()");
      expect(content).toContain("BaseCategory");
    });

    it("generates LocalizedCategory with self-referencing children", async () => {
      await generate({
        generateClient: false,
        input: recursiveFixture,
        output: outputDir,
      });

      const content = await readSchema("LocalizedCategory.ts");

      /* Should reference itself (not BaseCategory) for children */
      expect(content).toContain("LocalizedCategory");
      expect(content).not.toContain("z.unknown()");

      /* Should include the extra properties from the allOf */
      expect(content).toContain("displayName");
      expect(content).toContain("locale");
    });

    it("generates schemas that can be imported without errors", async () => {
      await generate({
        generateClient: false,
        input: recursiveFixture,
        output: outputDir,
      });

      const indexContent = await readSchema("index.ts");

      expect(indexContent).toContain("BaseCategory");
      expect(indexContent).toContain("LocalizedCategory");
    });
  });

  describe("pagination / generic wrapper", () => {
    it("generates PaginatedTemplate with default binding as z.unknown()", async () => {
      await generate({
        generateClient: false,
        input: paginationFixture,
        output: outputDir,
      });

      const content = await readSchema("PaginatedTemplate.ts");

      /* Standalone template: default $defs binding is `not: {}` → z.unknown() is correct */
      expect(content).toContain("z.unknown()");
      expect(content).toContain("items");
      expect(content).toContain("total");
    });

    it("generates PaginatedUserResponse with User items", async () => {
      await generate({
        generateClient: false,
        input: paginationFixture,
        output: outputDir,
      });

      const content = await readSchema("PaginatedUserResponse.ts");

      /* Consumer should reference User for item type */
      expect(content).toContain("User");
      expect(content).not.toContain("z.unknown()");
      expect(content).toContain("items");
      expect(content).toContain("total");
    });

    it("generates PaginatedGroupResponse with Group items", async () => {
      await generate({
        generateClient: false,
        input: paginationFixture,
        output: outputDir,
      });

      const content = await readSchema("PaginatedGroupResponse.ts");

      /* Consumer should reference Group for item type */
      expect(content).toContain("Group");
      expect(content).not.toContain("z.unknown()");
    });

    it("generates independent User and Group schemas", async () => {
      await generate({
        generateClient: false,
        input: paginationFixture,
        output: outputDir,
      });

      const userContent = await readSchema("User.ts");
      const groupContent = await readSchema("Group.ts");

      expect(userContent).toContain("email");
      expect(groupContent).toContain("name");
    });
  });

  describe("nested workspace with multiple dynamic anchors", () => {
    it("generates WorkspaceFolder with self-referencing children", async () => {
      await generate({
        generateClient: false,
        input: nestedFixture,
        output: outputDir,
      });

      const content = await readSchema("WorkspaceFolder.ts");

      /* Should reference WorkspaceFolder (not BaseFolder) in children oneOf */
      expect(content).toContain("WorkspaceFolder");
      expect(content).not.toContain("z.unknown()");

      /* Should include permissions from the allOf extension */
      expect(content).toContain("permissions");
    });

    it("generates BaseFolder as self-referencing standalone", async () => {
      await generate({
        generateClient: false,
        input: nestedFixture,
        output: outputDir,
      });

      const content = await readSchema("BaseFolder.ts");

      /* Should reference itself for the folder anchor */
      expect(content).toContain("BaseFolder");
      expect(content).not.toContain("z.unknown()");
    });

    it("generates Document schema unchanged", async () => {
      await generate({
        generateClient: false,
        input: nestedFixture,
        output: outputDir,
      });

      const content = await readSchema("Document.ts");

      expect(content).toContain("title");
      expect(content).toContain("kind");
    });
  });

  describe("client generation with $dynamicRef schemas", () => {
    it("generates client operations alongside resolved schemas", async () => {
      await generate({
        generateClient: true,
        input: recursiveFixture,
        output: outputDir,
      });

      const schemasDir = join(outputDir, "schemas");
      const files = await fs.readdir(schemasDir);

      expect(files).toContain("BaseCategory.ts");
      expect(files).toContain("LocalizedCategory.ts");
      expect(files).toContain("index.ts");
    });
  });
});

async function readSchema(filename: string): Promise<string> {
  return fs.readFile(join(outputDir, "schemas", filename), "utf-8");
}
