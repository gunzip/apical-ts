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
  private imports: ImportInfo[] = [];

  addConfigImport(configName: string): void {
    // Check for existing import to avoid duplicates
    if (
      !this.imports.some(
        (imp) => imp.type === "config" && imp.name === configName,
      )
    ) {
      this.imports.push({
        filePath: "./config.js",
        name: configName,
        type: "config",
      });
    }
  }

  addParameterImport(schemaName: string, operationId: string): void {
    // Check for existing import to avoid duplicates
    if (
      !this.imports.some(
        (imp) =>
          imp.type === "parameter" &&
          imp.name === schemaName &&
          imp.operationId === operationId,
      )
    ) {
      this.imports.push({
        name: schemaName,
        operationId,
        type: "parameter",
      });
    }
  }

  addParameterSchema(
    operationId: string,
    parameterType: ParameterType,
    name?: string,
  ): void {
    const schemaName = name || `${operationId}${parameterType}Schema`;
    // Check for existing import to avoid duplicates
    if (
      !this.imports.some(
        (imp) =>
          imp.type === "parameter" &&
          imp.name === schemaName &&
          imp.operationId === operationId &&
          imp.parameterType === parameterType &&
          imp.isSchema === true,
      )
    ) {
      this.imports.push({
        isSchema: true,
        name: schemaName,
        operationId,
        parameterType,
        type: "parameter",
      });
    }
  }

  addParameterType(
    operationId: string,
    parameterType: ParameterType,
    name?: string,
  ): void {
    const typeName = name || `${operationId}${parameterType}`;
    // Check for existing import to avoid duplicates
    if (
      !this.imports.some(
        (imp) =>
          imp.type === "parameter" &&
          imp.name === typeName &&
          imp.operationId === operationId &&
          imp.parameterType === parameterType &&
          imp.isSchema === false,
      )
    ) {
      this.imports.push({
        isSchema: false,
        name: typeName,
        operationId,
        parameterType,
        type: "parameter",
      });
    }
  }

  addSchemaImport(schemaName: string): void {
    // Check for existing import to avoid duplicates
    if (
      !this.imports.some(
        (imp) => imp.type === "schema" && imp.name === schemaName,
      )
    ) {
      this.imports.push({
        filePath: `../schemas/${schemaName}.js`,
        name: schemaName,
        type: "schema",
      });
    }
  }

  addZodImport(): void {
    // Check for existing import to avoid duplicates
    if (!this.imports.some((imp) => imp.type === "zod")) {
      this.imports.push({
        name: "z",
        type: "zod",
      });
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
}
