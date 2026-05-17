import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";
import type { OperationMetadata } from "@apical-ts/core-utils/shared";
import { ImportManager } from "@apical-ts/core-utils";

import {
  writeRouteMetadataFile,
  writeRoutesIndexFile,
} from "../src/file-writer.js";

describe("route-generator file writer", () => {
  it("writes route files and index imports using sanitized operation IDs", async () => {
    const routesDir = await mkdtemp(join(tmpdir(), "route-generator-"));

    await writeRouteMetadataFile(
      "addonPropertiesResource.deleteAddonProperty_delete",
      "export const clientRoute = {};\nexport const serverRoute = {};",
      new ImportManager(),
      routesDir,
    );

    const testOperation: OperationMetadata = {
      method: "delete",
      operation: {},
      operationId: "addonPropertiesResource.deleteAddonProperty_delete",
      pathKey: "/addon/properties",
      pathLevelParameters: [],
    };

    await writeRoutesIndexFile([testOperation], routesDir);

    const filenames = await readdir(routesDir);
    const indexContent = await readFile(join(routesDir, "index.ts"), "utf8");

    expect(filenames).toContain(
      "addonPropertiesResourceDeleteAddonPropertyDelete.ts",
    );
    expect(filenames).not.toContain(
      "addonPropertiesResource.deleteAddonProperty_delete.ts",
    );
    expect(indexContent).toContain(
      "./addonPropertiesResourceDeleteAddonPropertyDelete.ts",
    );
  });

  it("throws when sanitized route operation ids collide", async () => {
    const routesDir = await mkdtemp(join(tmpdir(), "route-generator-"));

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
      writeRoutesIndexFile(duplicateOperations, routesDir),
    ).rejects.toThrow(
      'Duplicate sanitized operation ID "petsList" produced by operation IDs "pets-list" and "pets_list"',
    );
  });
});
