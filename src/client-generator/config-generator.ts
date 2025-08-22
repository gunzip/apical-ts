/**
 * Generates the configuration file content and types
 */

/**
 * Generates the configuration file content
 */
export function generateConfigFileContent(
  authHeaders: string[],
  serverUrls: string[] = []
): string {
  return generateConfigTypes(authHeaders, serverUrls);
}

/**
 * Generate configuration types
 */
export function generateConfigTypes(
  authHeaders: string[],
  serverUrls: string[] = []
): string {
  const authHeadersType =
    authHeaders.length > 0
      ? authHeaders.map((h) => `'${h}'`).join(" | ")
      : "string";

  // Generate baseURL type as union of server URLs and any string
  const baseURLType =
    serverUrls.length > 0
      ? serverUrls.map((url) => `'${url}'`).join(" | ") + " | (string & {})"
      : "string";

  // Use first server URL as default, or empty string if none
  const defaultBaseURL = serverUrls.length > 0 ? serverUrls[0] : "";

  return `
// Configuration types
export interface GlobalConfig {
  baseURL: ${baseURLType};
  fetch: typeof fetch;
  headers: {
    [K in ${authHeaders.length > 0 ? `AuthHeaders` : "string"}]?: string;
  } & Record<string, string>;
}

${authHeaders.length > 0 ? `export type AuthHeaders = ${authHeadersType};` : ""}

// Default global configuration - immutable
export const globalConfig: GlobalConfig = {
  baseURL: '${defaultBaseURL}',
  fetch: fetch,
  headers: {}
};

/**
 * Represents a generic API response for the new discriminated union pattern.
 * @template S The HTTP status code.
 * @template T The response body type.
 */
export type ApiResponse<S extends number, T> = {
  readonly status: S;
  readonly data: T;
  readonly response: Response;
};

/**
 * Type guards for response status codes
 */
export function isSuccessResponse<T>(
  result: ApiResponse<number, any>
): result is ApiResponse<number, T> {
  return result.status >= 200 && result.status < 300;
}

export function isErrorResponse<T>(
  result: ApiResponse<number, any>
): result is ApiResponse<number, T> {
  return !isSuccessResponse(result);
}

/**
 * Error thrown when receiving an unexpected response status code
 */
export class UnexpectedResponseError extends Error {
  status: number;
  data: unknown;
  response: Response;
  
  constructor(status: number, data: unknown, response: Response) {
    super(\`Unexpected response status: \${status}\`);
    this.name = 'UnexpectedResponseError';
    this.status = status;
    this.data = data;
    this.response = response;
  }
}

/**
 * Type-safe status checking function
 * Only allows checking for status codes that exist in the given response union
 */
export function isStatus<
  TResponse extends ApiResponse<number, any>,
  S extends TResponse['status']
>(
  result: TResponse,
  status: S,
): result is Extract<TResponse, { status: S }> {
  return result.status === status;
}

/**
 * Utility function to handle response with exhaustive type checking
 */
export function handleResponse<T extends ApiResponse<number, any>>(
  result: T,
  handlers: {
    [K in T['status']]?: (data: Extract<T, { status: K }>['data']) => void;
  } & {
    default?: (result: T) => void;
  }
): void {
  const handler = handlers[result.status as keyof typeof handlers];
  if (handler) {
    (handler as any)(result.data);
  } else if (handlers.default) {
    handlers.default(result);
  }
}

/**
 * Helper function to parse response body based on content type
 */
export async function parseResponseBody(response: Response): Promise<unknown | Blob | FormData | ReadableStream | Response> {
  const contentType = response.headers.get('content-type') || '';

  // Handle JSON content types
  if (contentType.includes('application/json') || 
      contentType.includes('+json')) {
    return response.json().catch(() => null);
  }

  // Handle text content types
  if (contentType.includes('text/') || 
      contentType.includes('application/xml') ||
      contentType.includes('application/xhtml+xml')) {
    return response.text().catch(() => null);
  }
  
  // Handle binary file types that should be returned as Blob
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
  
  // Handle form data
  if (contentType.includes('multipart/form-data')) {
    return response.formData().catch(() => null);
  }
  
  // Handle URL encoded data
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return response.text().catch(() => null);
  }
  
  // For very large responses or streaming, you might want to return the response itself
  // to let the caller decide how to handle it
  if (contentType.includes('application/octet-stream') && 
      parseInt(response.headers.get('content-length') || '0') > 10 * 1024 * 1024) {
    // For files larger than 10MB, return the response to allow streaming
    return response;
  }
  
  // Default to text for unknown content types
  return response.text().catch(() => null);
}

// ApiError class for backwards compatibility
export class ApiError extends Error {
  status: number;
  body: unknown;
  headers: Headers;
  constructor(status: number, body: unknown, headers: Headers) {
    super(\`API Error: \${status}\`);
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

// Utility types for operation binding
type Operation = (params: any, config?: GlobalConfig) => Promise<any>;

// Bind all operations with a specific config
export function configureOperations<T extends Record<string, Operation>>(
  operations: T, 
  config: GlobalConfig
): {
  [K in keyof T]: (params: Parameters<T[K]>[0]) => ReturnType<T[K]>;
} {
  const bound: Partial<Record<keyof T, any>> = {};
  for (const key in operations) {
    if (typeof operations[key] === 'function') {
      bound[key] = (params: any) => operations[key](params, config);
    }
  }
  return bound as any;
}
`;
}
