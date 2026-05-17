import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeParameterSchemaFile } from "../../src/schema-generator/parameter-file-generator.js";

const tempDirs: string[] = [];

describe("parameter-file-generator", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((directory) => fs.rm(directory, { force: true, recursive: true })),
    );
  });

  it("emits explicit client parameter aliases when the inline heuristic is enabled", async () => {
    const schemasDir = await fs.mkdtemp(path.join(tmpdir(), "apical-params-"));
    tempDirs.push(schemasDir);

    await writeParameterSchemaFile(
      schemasDir,
      "getUser",
      {
        operationId: "getUser",
        parameterGroups: {
          headerParams: [],
          pathParams: [],
          queryParams: [
            {
              in: "query",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
          ],
        },
        securityHeaders: [],
      },
      {
        totalGeneratedSchemaCount: 100,
      },
    );

    const content = await fs.readFile(
      path.join(schemasDir, "getUserParameters.ts"),
      "utf-8",
    );

    expect(content).toContain(
      'export type getUserQuerySchema = { "userId": string };',
    );
    expect(content).toContain(
      'export type getUserParsedParamsType = { "query": { "userId": string } };',
    );
  });
});
