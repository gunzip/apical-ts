/**
 * Type definitions for structured import management
 */

export interface ImportInfo {
  readonly filePath?: string; // For explicit file paths
  readonly name: string;
  readonly operationId?: string; // For parameter imports
  readonly type: "config" | "parameter" | "schema" | "zod";
}

export interface ParameterImportGroup {
  readonly imports: string[];
  readonly operationId: string;
}

export class ImportManager {
  private imports: ImportInfo[] = [];

  addConfigImport(configName: string): void {
    this.imports.push({
      filePath: "./config.js",
      name: configName,
      type: "config",
    });
  }

  addParameterImport(schemaName: string, operationId: string): void {
    this.imports.push({
      name: schemaName,
      operationId,
      type: "parameter",
    });
  }

  addSchemaImport(schemaName: string): void {
    this.imports.push({
      filePath: `../schemas/${schemaName}.js`,
      name: schemaName,
      type: "schema",
    });
  }

  addZodImport(): void {
    this.imports.push({
      name: "z",
      type: "zod",
    });
  }

  getAllImports(): ImportInfo[] {
    return [...this.imports];
  }

  getConfigImports(): ImportInfo[] {
    return this.imports.filter((imp) => imp.type === "config");
  }

  getParameterGroups(): ParameterImportGroup[] {
    const groups = new Map<string, string[]>();

    for (const imp of this.imports) {
      if (imp.type === "parameter" && imp.operationId) {
        if (!groups.has(imp.operationId)) {
          groups.set(imp.operationId, []);
        }
        groups.get(imp.operationId)?.push(imp.name);
      }
    }

    return Array.from(groups.entries()).map(([operationId, imports]) => ({
      imports,
      operationId,
    }));
  }

  getSchemaImports(): ImportInfo[] {
    return this.imports.filter((imp) => imp.type === "schema");
  }

  hasZodImport(): boolean {
    return this.imports.some((imp) => imp.type === "zod");
  }
}
