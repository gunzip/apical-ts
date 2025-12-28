/**
 * Type definitions for structured import management
 */

export interface ImportInfo {
  readonly alias?: string; // For aliased imports (e.g., clientRoute as testParameterWithDashClientRoute)
  readonly filePath?: string; // For explicit file paths
  readonly isSchema?: boolean; // Whether it's a schema (e.g., QuerySchema) vs type (e.g., Query)
  readonly name: string;
  readonly operationId?: string; // For parameter imports or route imports
  readonly parameterType?: ParameterType; // For parameter imports
  readonly requestMapName?: string; // For route imports
  readonly responseMapName?: string; // For route imports
  readonly type: "config" | "parameter" | "route" | "schema" | "zod";
}

export interface ParameterImportGroup {
  readonly imports: string[];
  readonly operationId: string;
}

export type ParameterType = "Headers" | "Path" | "Query";

export class ImportManager {
  private importKeys = new Set<string>();
  private imports: ImportInfo[] = [];

  /**
   * Adds import for clientRoute from route file
   */
  addClientRouteImport(operationId: string): void {
    const clientRouteName = `${operationId}ClientRoute`;
    const importInfo: ImportInfo = {
      alias: clientRouteName,
      filePath: `../routes/${operationId}.js`,
      name: "clientRoute",
      operationId,
      type: "route",
    };
    const key = this.generateKey(importInfo);

    if (!this.importKeys.has(key)) {
      this.importKeys.add(key);
      this.imports.push(importInfo);
    }
  }

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

  /**
   * Adds import from route file (requestMap, responseMap, and potentially response union type)
   */
  addRouteImport(
    operationId: string,
    requestMapName: string,
    responseMapName: string,
  ): void {
    // Import request map (both type and value with same name, distinguished by TypeScript automatically)
    const requestMapImportInfo: ImportInfo = {
      filePath: `../routes/${operationId}.js`,
      name: requestMapName,
      operationId,
      requestMapName,
      type: "route",
    };
    const requestMapKey = this.generateKey(requestMapImportInfo);

    if (!this.importKeys.has(requestMapKey)) {
      this.importKeys.add(requestMapKey);
      this.imports.push(requestMapImportInfo);
    }

    // Import response map (both type and value with same name)
    const responseMapImportInfo: ImportInfo = {
      filePath: `../routes/${operationId}.js`,
      name: responseMapName,
      operationId,
      responseMapName,
      type: "route",
    };
    const responseMapKey = this.generateKey(responseMapImportInfo);

    if (!this.importKeys.has(responseMapKey)) {
      this.importKeys.add(responseMapKey);
      this.imports.push(responseMapImportInfo);
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

  getRouteImports(): ImportInfo[] {
    return this.imports.filter((imp) => imp.type === "route");
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
      importInfo.requestMapName,
      importInfo.responseMapName,
    ];
    return parts.filter(Boolean).join("|");
  }
}
