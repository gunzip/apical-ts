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
 *
 * @example
 * ```javascript
 * const typeImports = new Set(['User', 'Pet']);
 * const imports = buildOperationImports(typeImports);
 * // Result: [
 * //   "import type { GlobalConfig, ApiResponse, ApiResponseError } from './config.js';",
 * //   "import { globalConfig, parseResponseBody, parseApiResponseUnknownData } from './config.js';",
 * //   "import { User } from '../schemas/User.js';",
 * //   "import { Pet } from '../schemas/Pet.js';",
 * // ]
 * ```
 */
export function buildOperationImports(
  typeImports: Set<string>,
  functionCode?: string,
): string[] {
  /* Categorize config imports into types and runtime values */
  const configTypeImports = ["GlobalConfig", "ApiResponse", "ApiResponseError"];
  const configValueImports = [
    "globalConfig",
    "parseResponseBody",
    "parseApiResponseUnknownData",
  ];

  /* Add ApiResponseWithParse if used in the function */
  if (functionCode && functionCode.includes("ApiResponseWithParse")) {
    configTypeImports.push("ApiResponseWithParse");
  }

  /* Add ApiResponseWithForcedParse if used in the function */
  if (functionCode && functionCode.includes("ApiResponseWithForcedParse")) {
    configTypeImports.push("ApiResponseWithForcedParse");
  }

  /* Add createForcedParseResponse helper function if used */
  if (functionCode && functionCode.includes("createForcedParseResponse")) {
    configValueImports.push("createForcedParseResponse");
  }

  /* Add formUrlEncode helper import when operation body handling uses urlencoded serialization */
  if (functionCode && functionCode.includes("formUrlEncode(")) {
    configValueImports.push("formUrlEncode");
  }

  /* Add buildFormData helper import when multipart/form-data handling is used */
  if (functionCode && functionCode.includes("buildFormData(")) {
    configValueImports.push("buildFormData");
  }

  /* RequestBody alias used by generated operation body typing */
  if (functionCode && functionCode.includes("RequestBody")) {
    configTypeImports.push("RequestBody");
  }

  const imports: string[] = [];

  /* Add type imports from config */
  imports.push(
    `import type { ${configTypeImports.join(", ")} } from "./config.js";`,
  );

  /* Add value imports from config */
  imports.push(
    `import { ${configValueImports.join(", ")} } from "./config.js";`,
  );

  /* Add Zod import if needed for parameter schemas */
  if (typeImports.has("z")) {
    imports.push(`import { z } from "zod";`);
  }

  /* Add schema imports */
  const schemaImports = Array.from(typeImports)
    .filter((type) => type !== "z") // Exclude Zod import
    .map((type) => `import { ${type} } from "../schemas/${type}.js";`);

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
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}
