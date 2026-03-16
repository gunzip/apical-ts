import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";
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

    await writeRoutesIndexFile(
      [
        {
          operationId: "addonPropertiesResource.deleteAddonProperty_delete",
        } as never,
      ],
      routesDir,
    );

    const filenames = await readdir(routesDir);
    const indexContent = await readFile(join(routesDir, "index.ts"), "utf8");

    expect(filenames).toContain(
      "addonPropertiesResourceDeleteAddonPropertyDelete.ts",
    );
    expect(filenames).not.toContain(
      "addonPropertiesResource.deleteAddonProperty_delete.ts",
    );
    expect(indexContent).toContain(
      './addonPropertiesResourceDeleteAddonPropertyDelete.js',
    );
  });
});
