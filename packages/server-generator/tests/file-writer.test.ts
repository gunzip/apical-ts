import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

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

    await writeServerIndexFile(
      [
        {
          operationId: "addonPropertiesResource.deleteAddonProperty_delete",
        } as never,
      ],
      serverDir,
    );

    const filenames = await readdir(serverDir);
    const indexContent = await readFile(join(serverDir, "index.ts"), "utf8");

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
