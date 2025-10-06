/*
 * Integration test for Zod to ArkType workflow
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { convertZodToArkType } from "../src/converter.js";
import { parseZodSchemaFile } from "../src/parser.js";
import { writeArktypeSchema } from "../src/file-writer.js";

describe("Zod to ArkType Integration", () => {
  const testDir = "/tmp/zod-to-arktype-integration-test";
  const inputDir = join(testDir, "input");
  const outputDir = join(testDir, "output");

  beforeAll(async () => {
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should convert a simple Zod schema to ArkType", async () => {
    /* Create a test Zod schema file */
    const zodSchema = `import { z } from 'zod';

/**
 * A simple user schema
 */
export const User = z.object({"id": z.string(), "name": z.string(), "email": z.string().email()});
export type User = z.infer<typeof User>;`;

    const inputPath = join(inputDir, "User.ts");
    await writeFile(inputPath, zodSchema);

    /* Parse the Zod schema */
    const parsed = await parseZodSchemaFile(inputPath);
    expect(parsed.schemaName).toBe("User");
    expect(parsed.imports).toHaveLength(1);

    /* Convert to ArkType */
    const converted = convertZodToArkType(
      parsed.schemaDefinition,
      parsed.schemaName,
    );
    expect(converted.code).toContain("type({");
    expect(converted.code).toContain('"string"');
    expect(converted.code).toContain('"string.email"');

    /* Write the ArkType schema */
    const outputPath = join(outputDir, "User.ts");
    await writeArktypeSchema(outputPath, {
      arktypeCode: converted.code,
      comments: parsed.comments,
      importSources: new Map(),
      imports: converted.imports,
      schemaName: parsed.schemaName,
    });

    /* Verify the output file */
    const output = await readFile(outputPath, "utf-8");
    expect(output).toContain('import { type } from "arktype"');
    expect(output).toContain("export const User =");
    expect(output).toContain("export type User = typeof User.infer");
    expect(output).toContain("A simple user schema");
  });

  it("should handle schema with imports", async () => {
    /* Create schemas with cross-references */
    const addressSchema = `import { z } from 'zod';

export const Address = z.object({"street": z.string(), "city": z.string()});
export type Address = z.infer<typeof Address>;`;

    const userSchema = `import { z } from 'zod';
import { Address } from "./Address.js";

export const User = z.object({"id": z.string(), "address": Address});
export type User = z.infer<typeof User>;`;

    await writeFile(join(inputDir, "Address.ts"), addressSchema);
    await writeFile(join(inputDir, "User2.ts"), userSchema);

    /* Parse and convert */
    const parsed = await parseZodSchemaFile(join(inputDir, "User2.ts"));
    const converted = convertZodToArkType(
      parsed.schemaDefinition,
      parsed.schemaName,
    );

    /* Schema references should be preserved in code */
    expect(converted.code).toContain("Address");

    /* Imports should be extracted from the parsed file, not the definition */
    const addressImport = parsed.imports.find((imp) =>
      imp.names.includes("Address"),
    );
    expect(addressImport).toBeDefined();

    /* Write with import sources */
    const sources = new Map<string, string>();
    sources.set("Address", "./Address.js");

    /* Build imports set from parsed imports */
    const imports = new Set<string>();
    for (const imp of parsed.imports) {
      for (const name of imp.names) {
        if (name !== "z") {
          imports.add(name);
        }
      }
    }

    await writeArktypeSchema(join(outputDir, "User2.ts"), {
      arktypeCode: converted.code,
      comments: parsed.comments,
      importSources: sources,
      imports,
      schemaName: parsed.schemaName,
    });

    const output = await readFile(join(outputDir, "User2.ts"), "utf-8");
    expect(output).toContain('import { Address } from "./Address.js"');
  });

  it("should handle arrays", async () => {
    const zodSchema = `import { z } from 'zod';

export const Tags = z.array(z.string());
export type Tags = z.infer<typeof Tags>;`;

    const inputPath = join(inputDir, "Tags.ts");
    await writeFile(inputPath, zodSchema);

    const parsed = await parseZodSchemaFile(inputPath);
    const converted = convertZodToArkType(
      parsed.schemaDefinition,
      parsed.schemaName,
    );

    expect(converted.code).toBe('(type("string")).array()');
  });

  it("should handle unions", async () => {
    const zodSchema = `import { z } from 'zod';

export const Status = z.union([z.literal("active"), z.literal("inactive")]);
export type Status = z.infer<typeof Status>;`;

    const inputPath = join(inputDir, "Status.ts");
    await writeFile(inputPath, zodSchema);

    const parsed = await parseZodSchemaFile(inputPath);
    const converted = convertZodToArkType(
      parsed.schemaDefinition,
      parsed.schemaName,
    );

    expect(converted.code).toContain(".or(");
    expect(converted.code).toContain("type.enumerated");
  });

  it("should handle optional fields", async () => {
    const zodSchema = `import { z } from 'zod';

export const User = z.object({"name": z.string(), "age": z.number().optional()});
export type User = z.infer<typeof User>;`;

    const inputPath = join(inputDir, "OptionalUser.ts");
    await writeFile(inputPath, zodSchema);

    const parsed = await parseZodSchemaFile(inputPath);
    const converted = convertZodToArkType(
      parsed.schemaDefinition,
      parsed.schemaName,
    );

    expect(converted.code).toContain('"age?"');
  });
});
