/* Configuration file rendering templates */

import type { ConfigStructure } from "../models/config-models.js";

/*
 * Renders the API response type definitions
 */
export function renderApiResponseTypes(): string {
  return `/**
 * Represents a generic API response for the new discriminated union pattern.
 * @template S The HTTP status code.
 * @template T The response body type.
 */
/*
 * ApiResponse now models validation errors as a top-level discriminated branch.
 * For JSON-like responses validated with Zod:
 *   { status: 200, data: ParsedType, response }
 * or { status: 200, error: ZodError, response }
 * This avoids nesting the error inside the data union and lets consumers test
 * for the presence of the error key directly on the result object.
 */
export type ApiResponse<S extends number, T> =
  | {
      readonly status: S;
      readonly data: T;
      readonly response: Response;
      readonly parse?: () => any;
    }
  | {
      readonly status: S;
      readonly error: import("zod").ZodError;
      readonly response: Response;
      readonly parse?: () => any;
    };`;
}

/*
 * Renders the AuthHeaders type export (if needed)
 */
export function renderAuthHeadersType(config: ConfigStructure): string {
  const { auth } = config;

  if (!auth.hasAuthHeaders) {
    return "";
  }

  return `export type AuthHeaders = ${auth.authHeadersType};`;
}

/*
 * Renders the default configuration object
 */
export function renderConfigImplementation(config: ConfigStructure): string {
  const { server } = config;

  return `// Default global configuration - immutable
export const globalConfig: GlobalConfig = {
  baseURL: '${server.defaultBaseURL}',
  fetch: fetch,
  headers: {}
};`;
}

/*
 * Renders the GlobalConfig interface
 */
export function renderConfigInterface(config: ConfigStructure): string {
  const { auth, server } = config;

  return `// Configuration types
export interface GlobalConfig {
  baseURL: ${server.baseURLType};
  fetch: typeof fetch;
  headers: {
    [K in ${auth.hasAuthHeaders ? `AuthHeaders` : "string"}]?: string;
  } & Record<string, string>;
}`;
}

/*
 * Renders the complete static support code
 */
export function renderConfigSupport(): string {
  return [
    renderApiResponseTypes(),
    "",
    renderTypeGuards(),
    "",
    renderErrorClasses(),
    "",
    renderUtilityFunctions(),
    "",
    renderOperationUtilities(),
  ].join("\n");
}

/*
 * Renders error class definitions
 */
export function renderErrorClasses(): string {
  return `/* Error thrown when receiving an unexpected response status code */
export class UnexpectedResponseError extends Error {
  status: number;
  data: unknown;
  response: Response;
  constructor(status: number, data: unknown, response: Response) {
  super('Unexpected response status: ' + status);
    this.name = 'UnexpectedResponseError';
    this.status = status;
    this.data = data;
    this.response = response;
  }
}

/* ApiError class for backwards compatibility */
export class ApiError extends Error {
  status: number;
  body: unknown;
  headers: Headers;
  constructor(status: number, body: unknown, headers: Headers) {
  super('API Error: ' + status);
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}`;
}

/*
 * Renders operation binding utilities
 */
export function renderOperationUtilities(): string {
  return `/* Utility types for operation binding */
type Operation = (params: any, config?: GlobalConfig) => Promise<any>;

/* Bind all operations with a specific config */
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
}`;
}

/*
 * Renders type guard functions for response status codes
 */
export function renderTypeGuards(): string {
  return `/* Type guards for response status codes */
export function isSuccessResponse<T>(
  result: ApiResponse<number, any>
): result is ApiResponse<number, T> {
  return result.status >= 200 && result.status < 300;
}

export function isErrorResponse<T>(
  result: ApiResponse<number, any>
): result is ApiResponse<number, T> {
  return !isSuccessResponse(result);
}`;
}

/*
 * Renders utility functions for response handling
 */
export function renderUtilityFunctions(): string {
  return `/* Type-safe status checking function */
export function isStatus<
  TResponse extends ApiResponse<number, any>,
  S extends TResponse['status']
>(
  result: TResponse,
  status: S,
): result is Extract<TResponse, { status: S }> {
  return result.status === status;
}

/* Utility function to handle response with exhaustive type checking */
export function handleResponse<T extends ApiResponse<number, any>>(
  result: T,
  handlers: {
    [K in T['status']]?: (
      payload: Extract<Extract<T, { status: K }>, { data: any }> extends infer R
        ? R extends { data: infer D }
          ? D
          : never
        : never,
      full: Extract<T, { status: K }>
    ) => void;
  } & {
    default?: (result: T) => void;
    error?: (error: import('zod').ZodError, full: T) => void;
  }
): void {
  if ('error' in result) {
    if (handlers.error) {
      handlers.error(result.error, result);
      return;
    }
    if (handlers.default) {
      handlers.default(result);
      return;
    }
  }
  const handler = handlers[result.status as keyof typeof handlers];
  if (handler && 'data' in result) {
    (handler as any)(result.data, result);
  } else if (handlers.default) {
    handlers.default(result);
  }
}

/* Helper function to parse response body based on content type */
export async function parseResponseBody(response: Response): Promise<unknown | Blob | FormData | ReadableStream | Response> {
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
export function getResponseContentType(response: Response): string {
  const raw = response.headers.get("content-type");
  return raw ? raw.split(";")[0].trim().toLowerCase() : "";
}

/* Generic parser for unknown data + schema map */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<
    string,
    { safeParse?: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }
  >
>(
  response: Response,
  data: unknown,
  schemaMap: TSchemaMap,
) {
  const contentType = getResponseContentType(response);
  const schema = schemaMap[contentType];
  if (!schema || typeof schema.safeParse !== "function") {
    return {
      contentType,
      missingSchema: true,
    };
  }
  const result = schema.safeParse(data);
  if (result.success) {
    return {
      contentType,
      parsed: result.data,
    };
  }
  return {
    contentType,
    error: result.error,
  };
}`;
}
