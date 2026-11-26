/* Header resolution utilities for generated client configuration */

/*
 * Renders runtime helper for resolving static or dynamic config headers
 */
export function renderHeaderResolutionUtilities(): string {
  return `export type ResolvableHeaders =
  | Partial<Record<string, string | undefined>>
  | (() =>
      | Partial<Record<string, string | undefined>>
      | Promise<Partial<Record<string, string | undefined>>>);

export async function resolveConfigHeaders(
  headers: ResolvableHeaders | undefined,
): Promise<Record<string, string>> {
  const rawHeaders = typeof headers === 'function' ? await headers() : headers;
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawHeaders ?? {})) {
    if (value !== undefined) {
      resolved[key] = value;
    }
  }
  return resolved;
}`;
}
