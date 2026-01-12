/* FormData and form URL encoding utilities */

/*
 * Renders FormData utility functions
 */
export function renderFormDataUtilities(): string {
  return `/* Helper to build FormData from a plain object. */
export function buildFormData(input: unknown): FormData {
  const fd = new FormData();
  if (!input || typeof input !== "object") {
    return fd;
  }
  const obj = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    // Detect blob-like objects using duck-typing
    const isBlobLike = value instanceof Blob || (
      typeof (value as { arrayBuffer?: unknown })?.arrayBuffer === "function" &&
      typeof (value as { stream?: unknown })?.stream === "function"
    );
    if (isBlobLike) {
      fd.append(key, value as Blob);
    } else if (typeof value === "string") {
      fd.append(key, value);
    } else {
      // For numbers, booleans, null, arrays, and objects
      fd.append(key, JSON.stringify(value));
    }
  }
  return fd;
}`;
}

/*
 * Renders form URL encoding utilities
 */
export function renderFormUrlEncodeUtilities(): string {
  return `/*
 * Serialize a complex object into application/x-www-form-urlencoded form using
 * URLSearchParams. Arrays are represented by repeating the key for each value
 * (e.g. key=a&key=b). Objects are JSON-stringified as a safe fallback.
 */
export type ArrayFormat = "repeat" | "brackets";

export interface FormUrlEncodeOptions {
  arrayFormat?: ArrayFormat;
}

export function formUrlEncode(
  input: unknown,
  options: FormUrlEncodeOptions = {},
): string {
  const { arrayFormat = "repeat" } = options; // 'repeat' by default
  const params = new URLSearchParams();

  if (!input || typeof input !== "object") {
    return params.toString();
  }

  const obj = input as Record<string, unknown>;

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) {
      continue;
    }

    if (Array.isArray(v)) {
      const arrayKey = arrayFormat === "brackets" ? \`\${k}[]\` : k;
      for (const item of v) {
        if (item !== undefined && item !== null) {
          params.append(arrayKey, String(item));
        }
      }
    } else if (typeof v === "object") {
      params.append(k, JSON.stringify(v));
    } else {
      params.append(k, String(v));
    }
  }
  return params.toString();
}`;
}
