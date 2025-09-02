import { describe, it, expect } from "vitest";
import { buildOperationImports } from "../../src/core-generator/file-writer";

describe("file-writer buildOperationImports", () => {
  it("includes formUrlEncode in config import when function code references it", () => {
    const typeImports = new Set<string>();
    const functionCode = `// some code\nconst body = formUrlEncode(payload);`;
    const imports = buildOperationImports(typeImports, functionCode);

    const found = imports.some((line) => line.includes("formUrlEncode"));
    expect(found).toBe(true);
  });
});
