import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";
import type { OperationMetadata } from "@apical-ts/core-utils/shared";

import {
  writeServerIndexFile,
  writeServerOperationFile,
} from "../src/file-writer.js";

describe("server-generator file writer", () => {
  it("writes wrapper files and index exports using sanitized operation IDs", async () => {
    const serverDir = await mkdtemp(join(tmpdir(), "server-generator-"));

    await writeServerOperationFile(
      "addonPropertiesResource.deleteAddonProperty_delete",
      "export const addonPropertiesResourceDeleteAddonPropertyDeleteWrapper = () => {};",
      serverDir,
    );

    const testOperation: OperationMetadata = {
      method: "delete",
      operation: {},
      operationId: "addonPropertiesResource.deleteAddonProperty_delete",
      pathKey: "/addon/properties",
      pathLevelParameters: [],
    };

    await writeServerIndexFile([testOperation], serverDir);

    const filenames = await readdir(serverDir);
    const indexContent = await readFile(join(serverDir, "index.ts"), "utf8");

    expect(filenames).toContain(
      "addonPropertiesResourceDeleteAddonPropertyDelete.ts",
    );
    expect(filenames).not.toContain(
      "addonPropertiesResource.deleteAddonProperty_delete.ts",
    );
    expect(indexContent).toContain(
      "./addonPropertiesResourceDeleteAddonPropertyDelete.js",
    );
  });

  it("throws when sanitized server operation ids collide", async () => {
    const serverDir = await mkdtemp(join(tmpdir(), "server-generator-"));

    const duplicateOperations: OperationMetadata[] = [
      {
        method: "get",
        operation: {},
        operationId: "pets-list",
        pathKey: "/pets",
        pathLevelParameters: [],
      },
      {
        method: "get",
        operation: {},
        operationId: "pets_list",
        pathKey: "/pets",
        pathLevelParameters: [],
      },
    ];

    await expect(
      writeServerIndexFile(duplicateOperations, serverDir),
    ).rejects.toThrow(
      'Duplicate sanitized operation ID "petsList" produced by operation IDs "pets-list" and "pets_list"',
    );
  });
});
