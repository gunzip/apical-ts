/* Shared template utilities */

/*
 * Renders Zod import statement
 */
export function renderZodImportStatement(): string {
  return `import type { z } from "zod/v4";
`;
}
