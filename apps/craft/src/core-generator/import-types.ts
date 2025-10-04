/**
 * Type definitions for structured import management
 */

export interface ImportInfo {
  readonly filePath?: string; // For explicit file paths
  readonly isSchema?: boolean; // Whether it's a schema (e.g., QuerySchema) vs type (e.g., Query)
  readonly name: string;
  readonly operationId?: string; // For parameter imports
  readonly parameterType?: ParameterType; // For parameter imports
  readonly type: "config" | "parameter" | "schema" | "zod";
}

export interface ParameterImportGroup {
  readonly imports: string[];
  readonly operationId: string;
}

export type ParameterType = "Headers" | "Path" | "Query";

export class ImportManager {
  private importKeys = new Set<string>();
  private imports: ImportInfo[] = [];

  addConfigImport(configName: string): void {
    const importInfo: ImportInfo = {
      filePath: "./config.js",
      name: configName,
      type: "config",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
  }

  addParameterImport(schemaName: string, operationId: string): void {
    const importInfo: ImportInfo = {
      name: schemaName,
      operationId,
      type: "parameter",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
  }

  addParameterSchema(
    operationId: string,
    parameterType: ParameterType,
    name?: string,
  ): void {
    const schemaName = name || `${operationId}${parameterType}Schema`;
    const importInfo: ImportInfo = {
      isSchema: true,
      name: schemaName,
      operationId,
      parameterType,
      type: "parameter",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
  }

  addParameterType(
    operationId: string,
    parameterType: ParameterType,
    name?: string,
  ): void {
    const typeName = name || `${operationId}${parameterType}`;
    const importInfo: ImportInfo = {
      isSchema: false,
      name: typeName,
      operationId,
      parameterType,
      type: "parameter",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
  }

  addSchemaImport(schemaName: string): void {
    const importInfo: ImportInfo = {
      filePath: `../schemas/${schemaName}.js`,
      name: schemaName,
      type: "schema",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
  }

  addZodImport(): void {
    const importInfo: ImportInfo = {
      name: "z",
      type: "zod",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
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

  getParameterImports(): ImportInfo[] {
    return this.imports.filter((imp) => imp.type === "parameter");
  }

  getParameterImportsForServer(): ImportInfo[] {
    return this.imports.filter(
      (imp) => imp.type === "parameter" && !imp.isSchema,
    );
  }

  getSchemaImports(): ImportInfo[] {
    return this.imports.filter((imp) => imp.type === "schema");
  }

  hasZodImport(): boolean {
    return this.imports.some((imp) => imp.type === "zod");
  }

  private generateKey(importInfo: Partial<ImportInfo>): string {
    const parts = [
      importInfo.type,
      importInfo.name,
      importInfo.filePath,
      importInfo.operationId,
      importInfo.parameterType,
      importInfo.isSchema?.toString(),
    ];
    return parts.filter(Boolean).join("|");
  }
}
