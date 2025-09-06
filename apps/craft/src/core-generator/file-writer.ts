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
 * Builds import statements for operation files
 *
 * @example
 * ```javascript
 * const typeImports = new Set(['User', 'Pet']);
 * const imports = buildOperationImports(typeImports);
 * // Result: [
 * //   "import { globalConfig, GlobalConfig, ApiResponse, parseResponseBody } from './config.js';",
 * //   "import { User } from '../schemas/User.js';",
 * //   "import { Pet } from '../schemas/Pet.js';",
 * // ]
 * ```
 */
export function buildOperationImports(
  typeImports: Set<string>,
  functionCode?: string,
): string[] {
  /* Determine which config types are needed based on function content */
  const configImports = [
    "globalConfig",
    "GlobalConfig",
    "ApiResponse",
    "parseResponseBody",
    "parseApiResponseUnknownData",
    "ApiResponseError",
  ];

  /* Add ApiResponseWithParse if used in the function */
  if (functionCode && functionCode.includes("ApiResponseWithParse")) {
    configImports.push("ApiResponseWithParse");
  }

  /* Add ApiResponseWithForcedParse if used in the function */
  if (functionCode && functionCode.includes("ApiResponseWithForcedParse")) {
    configImports.push("ApiResponseWithForcedParse");
  }

  /* Add createForcedParseResponse helper function if used */
  if (functionCode && functionCode.includes("createForcedParseResponse")) {
    configImports.push("createForcedParseResponse");
  }

  /* Add formUrlEncode helper import when operation body handling uses urlencoded serialization */
  if (functionCode && functionCode.includes("formUrlEncode(")) {
    configImports.push("formUrlEncode");
  }

  /* Add buildFormData helper import when multipart/form-data handling is used */
  if (functionCode && functionCode.includes("buildFormData(")) {
    configImports.push("buildFormData");
  }

  /* RequestBody alias used by generated operation body typing */
  if (functionCode && functionCode.includes("RequestBody")) {
    configImports.push("RequestBody");
  }

  const imports = [
    `import { ${configImports.join(", ")} } from './config.js';`,
  ];

  /* Add Zod import if needed for parameter schemas */
  if (typeImports.has("z")) {
    imports.push(`import { z } from 'zod';`);
  }

  /* Add schema imports */
  const schemaImports = Array.from(typeImports)
    .filter((type) => type !== "z") // Exclude Zod import
    .map((type) => `import { ${type} } from '../schemas/${type}.js';`);

  imports.push(...schemaImports);

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
