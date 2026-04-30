/* Response parsing utilities and request body types */

/* Render RequestBody alias used across generated clients */
export function renderRequestBodyType(): string {
  return `/* Common request body union for generated clients */
type RequestBodyArrayBufferView = Extract<
  NonNullable<RequestInit["body"]>,
  ArrayBufferView
>;

function isRequestBodyArrayBufferView(
  body: unknown,
): body is RequestBodyArrayBufferView {
  return ArrayBuffer.isView(body);
}

export type RequestBody = RequestInit["body"] | undefined;

export function normalizeRequestBody(body: unknown): RequestBody {
  if (body === undefined || body === null || typeof body === "string") {
    return body;
  }
  if (
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    isRequestBodyArrayBufferView(body) ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
  ) {
    return body;
  }
  return JSON.stringify(body);
}`;
}

/*
 * Renders response parsing utility functions
 */
export function renderResponseParsingUtilities(): string {
  return `export async function parseResponseBody(response: Response): Promise<unknown | Blob | FormData | ReadableStream | Response> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') ||
      contentType.includes('+json')) {
    return response.json().catch(() => null);
  }
  if (contentType.includes('text/') ||
      contentType.includes('application/xml') ||
      contentType.includes('application/xhtml+xml')) {
    return response.text().catch(() => null);
  }
  if (contentType.includes('image/') ||
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/pdf') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/x-zip-compressed') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/msword') ||
      contentType.includes('application/vnd.') ||
      contentType.includes('binary')) {
    return response.blob().catch(() => null);
  }
  if (contentType.includes('multipart/form-data')) {
    return response.formData().catch(() => null);
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return response.text().catch(() => null);
  }
  return response.text().catch(() => null);
}

/* Normalize Content-Type header */
export function getResponseContentType(response: MinimalResponse): string {
  const raw = response.headers.get("content-type");
  if (!raw) return "";
  const firstPart = raw.split(";")[0];
  return firstPart ? firstPart.trim().toLowerCase() : "";
}`;
}
