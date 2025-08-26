import { promises as fs } from "fs";
import { format } from "prettier";

/**
 * Builds the complete operation file content with imports and function code
 */
export function buildOperationFileContent(
  typeImports: Set<string>,
  functionCode: string,
): string {
  const importLines = buildOperationImports(typeImports);
  return `${importLines.join("\n")}\n\n${functionCode}`;
}

/**
 * Builds import statements for operation files
 *
 * @example
 * ```javascript
 * const typeImports = new Set(['User', 'Pet', 'ApiError']);
 * const imports = buildOperationImports(typeImports);
 * // Result: [
 * //   "import { globalConfig, GlobalConfig, ApiResponse, parseResponseBody, UnexpectedResponseError } from './config.js';",
 * //   "import { User } from '../schemas/User.js';",
 * //   "import { Pet } from '../schemas/Pet.js';",
 * //   "import { ApiError } from '../schemas/ApiError.js';"
 * // ]
 * ```
 */
export function buildOperationImports(typeImports: Set<string>): string[] {
  return [
    `import { globalConfig, GlobalConfig, ApiResponse, parseResponseBody, UnexpectedResponseError, parseApiResponseUnknownData } from './config.js';`,
    ...Array.from(typeImports).map(
      (type) => `import { ${type} } from '../schemas/${type}.js';`,
    ),
  ];
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
 * Formats TypeScript code using Prettier
 */
export async function formatTypeScript(code: string): Promise<string> {
  return format(code, { parser: "typescript" });
}

/**
 * Writes formatted TypeScript content to a file
 */
export async function writeFormattedFile(
  filePath: string,
  content: string,
): Promise<void> {
  try {
    const formattedContent = await formatTypeScript(content);
    await fs.writeFile(filePath, formattedContent);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}
