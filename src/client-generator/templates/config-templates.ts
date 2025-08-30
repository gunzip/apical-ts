/* Configuration file rendering templates */

import type { ConfigStructure } from "../models/config-models.js";

/*
 * Renders the API response type definitions
 */
export function renderApiResponseTypes(): string {
  return `/**
 * Represents a generic API response for the new discriminated union pattern.
 * @template S The HTTP status code.
 */
export type ApiResponse<S extends number, T> =
  | {
      readonly success: true;
      readonly status: S;
      readonly data: T;
      readonly response: Response;
    };

/*
 * Error type for operation failures
 * Represents all possible error conditions that can occur during an operation
 */
export type ApiResponseError =
  | {
      readonly kind: "fetch-error";
      readonly success: false;
      readonly error: string;
    }
  | {
      readonly kind: "unexpected-response";
      readonly success: false;
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: string;
    }
  | {
      readonly kind: "parse-error";
      readonly success: false;
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: z.ZodError;
    }
  | {
      readonly kind: "deserialization-error";
      readonly success: false;
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: unknown;
    }
  | {
      readonly kind: "missing-schema";
      readonly success: false;
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: string;
    };

/* Helper type: union of all models for a given status code */
type ResponseModelsForStatus<
  Map extends Record<string, Record<string, any>>,
  Status extends keyof Map
> = Map[Status][keyof Map[Status]];

export type ExtractResponseUnion<
  TResponseMap,
  TStatus extends keyof TResponseMap,
> =
  TResponseMap[TStatus] extends Record<string, infer TSchema>
    ? z.infer<TSchema>
    : never;

/*
 * Precise ApiResponse type with always-present, type-safe parse function
 * Used when response map information is available for type-safe parsing
 */
export type ApiResponseWithParse<
  S extends number,
  Map extends Record<string, Record<string, any>>,
> = {
  readonly success: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parse: () => ${"`${S}`"} extends keyof Map
    ?
        | {
            [K in keyof Map[${"`${S}`"}]]: {
              contentType: K;
              /* Narrow parsed type to the specific schema for this content type */
              parsed: z.infer<Map[${"`${S}`"}][K]>;
            };
          }[keyof Map[${"`${S}`"}]]
  | { kind: "parse-error"; error: z.ZodError }
  | { kind: "missing-schema"; error: string }
  | { kind: "deserialization-error"; error: unknown }
    : never;
};

/*
 * Precise ApiResponse type with forced validation and always-present parsed field
 * Used when forceValidation flag is enabled for automatic response validation
 */
export type ApiResponseWithForcedParse<
  S extends number,
  Map extends Record<string, Record<string, any>>,
> = {
  readonly success: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parsed: ${"`${S}`"} extends keyof Map
    ?
        | {
            [K in keyof Map[${"`${S}`"}]]: {
              contentType: K;
              /* Narrow parsed type to the specific schema for this content type */
              parsed: z.infer<Map[${"`${S}`"}][K]>;
            };
          }[keyof Map[${"`${S}`"}]]
  | { kind: "parse-error"; error: z.ZodError }
  | { kind: "missing-schema"; error: string }
  | { kind: "deserialization-error"; error: unknown }
    : never;
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

export function renderConfigImports(): string {
  return `import type { z } from "zod/v4";
`;
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
  deserializerMap?: DeserializerMap;
}`;
}

/*
 * Renders the complete static support code
 */
export function renderConfigSupport(): string {
  return [
    renderApiResponseTypes(),
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
 * Renders utility functions for response handling
 */
export function renderUtilityFunctions(): string {
  return `/* Helper function to parse response body based on content type */
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
  TSchemaMap extends Record<string, { safeParse: (value: unknown) => z.ZodSafeParseResult<unknown> }>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
): (
  | { [K in keyof TSchemaMap]: { contentType: K; parsed: z.infer<TSchemaMap[K]> } }[keyof TSchemaMap]
  | { kind: "parse-error"; error: z.ZodError }
  | { kind: "missing-schema"; error: string }
  | { kind: "deserialization-error"; error: unknown }
);

/* Overload with deserializerMap */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, { safeParse: (value: unknown) => z.ZodSafeParseResult<unknown> }>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
  deserializerMap: DeserializerMap,
): (
  | { [K in keyof TSchemaMap]: { contentType: K; parsed: z.infer<TSchemaMap[K]> } }[keyof TSchemaMap]
  | { kind: "parse-error"; error: z.ZodError }
  | { kind: "missing-schema"; error: string }
  | { kind: "deserialization-error"; error: unknown }
);

/* Implementation */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<
    string,
    { safeParse: (value: unknown) => z.ZodSafeParseResult<unknown> }
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
    if (deserializationError) {
      return { kind: "deserialization-error", error: deserializationError } as const;
    }
  return { kind: "missing-schema", error: \`No schema found for content-type: \${contentType}\` } as const;
  }

  /* Only proceed with Zod validation if deserialization succeeded */
  if (deserializationError) {
    return { kind: "deserialization-error", error: deserializationError } as const;
  }

  const result = schema.safeParse(deserializedData);
  if (result.success) {
    return { contentType, parsed: result.data };
  }
  return { kind: "parse-error", error: result.error } as const;
}

/* Type guard helpers for narrowing parse() results */
export function isParsed<
  T extends
    | { contentType: string; parsed: unknown }
    | { kind: "parse-error"; error: z.ZodError }
    | { kind: "missing-schema"; error: string }
    | { kind: "deserialization-error"; error: unknown }
>(value: T): value is Extract<T, { parsed: unknown }> {
  return !!value && "parsed" in (value as Record<string, unknown>);
}
`;
}
