import { promises as fs } from "fs";

/**
 * Builds the complete operation file content with imports and function code
 */
export function buildOperationFileContent(
  typeImports: Set<string>,
  functionCode: string,
): string {
  const importLines = buildOperationImports(typeImports, functionCode);
  return `${importLines.join("\n")}\n\n${functionCode}`;
}

/**
 * Builds import statements for operation files with separate type and value imports
 */
export function buildOperationImports(
  typeImports: Set<string>,
  functionCode?: string,
): string[] {
  const configImports = getConfigImports(functionCode);
  const imports: string[] = [];

  /* Add type imports from config */
  imports.push(
    `import type { ${configImports.typeImports.join(", ")} } from "./config.js";`,
  );

  /* Add value imports from config */
  imports.push(
    `import { ${configImports.valueImports.join(", ")} } from "./config.js";`,
  );

  /* Add Zod import if needed for parameter schemas */
  if (typeImports.has("z")) {
    imports.push(`import { z } from "zod";`);
  }

  /* Separate parameter imports from normal schema imports */
  const normalSchemaImports: string[] = [];
  const parameterImports: string[] = [];

  for (const type of Array.from(typeImports).filter((t) => t !== "z")) {
    if (isParameterImport(type)) {
      parameterImports.push(type);
    } else {
      normalSchemaImports.push(type);
    }
  }

  /* Add normal schema imports */
  normalSchemaImports.forEach((type) => {
    imports.push(`import { ${type} } from "../schemas/${type}.js";`);
  });

  /* Add parameter imports from combined Parameters files */
  if (parameterImports.length > 0) {
    const operationGroups = groupParameterImports(parameterImports);

    for (const [operationId, importList] of operationGroups) {
      imports.push(
        `import { ${importList.join(", ")} } from "../schemas/${operationId}Parameters.js";`,
      );
    }
  }

  return imports;
}

/**
 * Creates a directory if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

/**
 * Writes TypeScript content to a file at the specified path.
 */
export async function writeTypeScriptFile(
  filePath: string,
  content: string,
): Promise<void> {
  try {
    await fs.writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Extracts operation ID from parameter import name
 */
function extractOperationId(imp: string): string {
  if (
    imp.endsWith("QuerySchema") ||
    imp.endsWith("PathSchema") ||
    imp.endsWith("HeadersSchema")
  ) {
    return imp.replace(/(Query|Path|Headers)Schema$/, "");
  } else if (
    imp.endsWith("Query") ||
    imp.endsWith("Path") ||
    imp.endsWith("Headers")
  ) {
    return imp.replace(/(Query|Path|Headers)$/, "");
  }
  return "";
}

/**
 * Determines dynamic config imports based on function code usage
 */
function getConfigImports(functionCode?: string): {
  typeImports: string[];
  valueImports: string[];
} {
  const configTypeImports = ["GlobalConfig", "ApiResponse", "ApiResponseError"];
  const configValueImports = [
    "globalConfig",
    "parseResponseBody",
    "parseApiResponseUnknownData",
  ];

  if (functionCode?.includes("ApiResponseWithParse")) {
    configTypeImports.push("ApiResponseWithParse");
  }

  if (functionCode?.includes("ApiResponseWithForcedParse")) {
    configTypeImports.push("ApiResponseWithForcedParse");
  }

  if (functionCode?.includes("createForcedParseResponse")) {
    configValueImports.push("createForcedParseResponse");
  }

  if (functionCode?.includes("formUrlEncode(")) {
    configValueImports.push("formUrlEncode");
  }

  if (functionCode?.includes("buildFormData(")) {
    configValueImports.push("buildFormData");
  }

  if (functionCode?.includes("serializeQueryParam(")) {
    configValueImports.push("serializeQueryParam");
  }

  if (functionCode?.includes("serializePathParam(")) {
    configValueImports.push("serializePathParam");
  }

  if (functionCode?.includes("serializeHeaderParam(")) {
    configValueImports.push("serializeHeaderParam");
  }

  if (functionCode?.includes("RequestBody")) {
    configTypeImports.push("RequestBody");
  }

  return { typeImports: configTypeImports, valueImports: configValueImports };
}

/**
 * Groups parameter imports by operation ID
 */
function groupParameterImports(
  parameterImports: string[],
): Map<string, string[]> {
  const operationGroups = new Map<string, string[]>();

  for (const imp of parameterImports) {
    const operationId = extractOperationId(imp);

    if (operationId) {
      if (!operationGroups.has(operationId)) {
        operationGroups.set(operationId, []);
      }
      const group = operationGroups.get(operationId);
      if (group) {
        group.push(imp);
      }
    }
  }

  return operationGroups;
}

/**
 * Determines if an import is parameter-related
 */
function isParameterImport(type: string): boolean {
  const isParameterSchema =
    type.endsWith("Schema") &&
    (type.includes("Query") ||
      type.includes("Path") ||
      type.includes("Headers"));
  const isParameterType =
    type.endsWith("Query") || type.endsWith("Path") || type.endsWith("Headers");
  return isParameterSchema || isParameterType;
}
