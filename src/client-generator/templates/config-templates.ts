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
      readonly parse?: () => ReturnType<typeof parseApiResponseUnknownData>;
    }
  | {
      readonly status: S;
      readonly error: import("zod").ZodError;
      readonly response: Response;
      readonly parse?: () => ReturnType<typeof parseApiResponseUnknownData>;
    };

/* Helper type: union of all models for a given status code */
type ResponseModelsForStatus<
  Map extends Record<string, Record<string, any>>,
  Status extends keyof Map
> = Map[Status][keyof Map[Status]];

/*
 * Precise ApiResponse type with always-present, type-safe parse function
 * Used when response map information is available for type-safe parsing
 */
export type ApiResponseWithParse<
  S extends number,
  Map extends Record<string, Record<string, any>>
> = \`\${S}\` extends keyof Map ? {
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parse: (
    deserializerMap?: Partial<Record<keyof Map, Deserializer>>
  ) => ReturnType<typeof parseApiResponseUnknownData>;
} : never;`;
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
  headers: {},
};

/* A minimal, serializable representation of a fetch Response */
export type MinimalResponse = {
  readonly status: number;
  readonly headers: {
    get(name: string): string | null | undefined;
  };
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
}`;
}

/*
 * Renders operation binding utilities
 */
export function renderOperationUtilities(): string {
  return `/* Utility types for operation binding */
type Operation = (params: any, config?: GlobalConfig) => Promise<unknown>;

/* Bind all operations with a specific config */
export function configureOperations<T extends Record<string, Operation>>(
  operations: T, 
  config: GlobalConfig
): {
  [K in keyof T]: (params: Parameters<T[K]>[0]) => ReturnType<T[K]>;
} {
  const bound: Partial<Record<keyof T, (params: unknown) => Promise<unknown>>> = {};
  for (const key in operations) {
    if (typeof operations[key] === 'function') {
      bound[key] = (params: unknown) => operations[key](params, config);
    }
  }
  return bound as {
    [K in keyof T]: (params: Parameters<T[K]>[0]) => ReturnType<T[K]>;
  };
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
  TResponse extends ApiResponse<number, unknown>,
  S extends TResponse['status']
>(
  result: TResponse,
  status: S,
): result is Extract<TResponse, { status: S }> {
  return result.status === status;
}

/* Utility function to handle response with exhaustive type checking */
export function handleResponse<T extends ApiResponse<number, unknown>>(
  result: T,
  handlers: {
    [K in T['status']]?: (
      payload: Extract<Extract<T, { status: K }>, { data: unknown }> extends infer R
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
    /* Use type assertion here as TypeScript can't infer the exact type */
    (handler as (payload: unknown, full: T) => void)(result.data, result);
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
export function getResponseContentType(response: MinimalResponse): string {
  const raw = response.headers.get("content-type");
  return raw ? raw.split(";")[0].trim().toLowerCase() : "";
}

/* Type definitions for pluggable deserialization */
export type Deserializer = (data: unknown, contentType?: string) => unknown;
export type DeserializerMap = Record<string, Deserializer>;

/* Overload without deserializerMap */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
): (
  | { [K in keyof TSchemaMap]: { contentType: K; parsed: import("zod").infer<TSchemaMap[K]> } }[keyof TSchemaMap]
  | { contentType: string; error: unknown }
  | { contentType: string; missingSchema: true; deserialized: unknown }
);

/* Overload with deserializerMap */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
  deserializerMap: DeserializerMap,
): (
  | { [K in keyof TSchemaMap]: { contentType: K; parsed: import("zod").infer<TSchemaMap[K]> } }[keyof TSchemaMap]
  | { contentType: string; error: unknown }
  | { contentType: string; missingSchema: true; deserialized: unknown }
  | { contentType: string; deserializationError: unknown }
);

/* Implementation */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<
    string,
    { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }
  >
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
  deserializerMap?: DeserializerMap,
) {
  const contentType = getResponseContentType(response);
  
  /* Apply custom deserializer if provided */
  let deserializedData = data;
  let deserializationError: unknown = undefined;
  
  if (deserializerMap && deserializerMap[contentType]) {
    try {
      deserializedData = deserializerMap[contentType](data, contentType);
    } catch (error) {
      deserializationError = error;
    }
  }
  
  const schema = schemaMap[contentType];
  if (!schema || typeof schema.safeParse !== "function") {
    const base = {
      contentType,
      missingSchema: true as const,
      deserialized: deserializedData,
    };
    if (deserializationError) {
      return {
        ...base,
        deserializationError,
      };
    }
    return base;
  }
  
  /* Only proceed with Zod validation if deserialization succeeded */
  if (deserializationError) {
    return {
      contentType,
      deserializationError,
    };
  }
  
  const result = schema.safeParse(deserializedData);
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
