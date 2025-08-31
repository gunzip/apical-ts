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

/**
 * Extended info for API responses errors
 */
type ApiResponseErrorResult = {
  readonly data: unknown;
  readonly status: number;
  readonly response: Response;
};

/*
 * Error type for operation failures
 * Represents all possible error conditions that can occur during an operation
 */
export type ApiResponseError = {
  readonly success: false;
} & (
  | {
      readonly kind: "unexpected-error";
      readonly error: unknown;
    }
  | {
      readonly kind: "unexpected-response";
      readonly result: ApiResponseErrorResult;
      readonly error: string;
    }
  | {
      readonly kind: "parse-error";
      readonly result: ApiResponseErrorResult;
      readonly error: z.ZodError;
    }
  | {
      readonly kind: "deserialization-error";
      readonly result: ApiResponseErrorResult;
      readonly error: unknown;
    }
  | {
      readonly kind: "missing-schema";
      readonly result: ApiResponseErrorResult;
      readonly error: string;
    }
);

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
  forceValidation: false
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
  forceValidation?: boolean;
}`;
}

/*
 * Renders the complete static support code
 */
export function renderConfigSupport(): string {
  return [
    renderApiResponseTypes(),
    "",
    renderUtilityFunctions(),
    "",
    renderOperationUtilities(),
  ].join("\n");
}

/*
 * Renders operation binding utilities
 */
export function renderOperationUtilities(): string {
  return `/* Utility types for operation binding */
type Operation = (...args: any[]) => any;

/* Extract the specific overload matching the provided forceValidation literal.
 * If an overload exists with that exact config type, we bind to its return type; otherwise
 * we fall back to the generic signature (last overload) and post-process ApiResponseWithParse
 * variants when forceValidation === true to their forced counterparts.
 */
type ExtractOverloadForForce<TOp, TForce extends boolean> = Extract<
  TOp,
  (params: any, config: { forceValidation: TForce } & GlobalConfig) => any
> extends (params: infer P, config: any) => infer R
  ? (params: P) => R
  : TOp extends (params: infer P, config?: any) => infer R
  ? (params: P) => R
  : never;

// Distribute over unions and replace ApiResponseWithParse members when forceValidation=true
type ReplaceWithForcedParse<U> = U extends any
  ? U extends ApiResponseWithParse<infer S, infer Map>
    ? ApiResponseWithForcedParse<S, Map>
    : U
  : never;

// When forceValidation is false we remove any forced-parse variants so consumers
// only see the manual parse() shape; this improves DX (parse() becomes available
// after narrowing success/status without additional guards).
type RemoveForcedParse<U> = U extends any
  ? U extends ApiResponseWithForcedParse<any, any>
    ? never
    : U
  : never;

type ForceAdjust<R, TForce extends boolean> = TForce extends true
  ? R extends Promise<infer U>
    ? Promise<ReplaceWithForcedParse<U>>
    : ReplaceWithForcedParse<R>
  : R extends Promise<infer U>
    ? Promise<RemoveForcedParse<U>>
    : RemoveForcedParse<R>;

type BoundOperation<TOp, TForce extends boolean> = ForceAdjust<
  ExtractOverloadForForce<TOp, TForce> extends (params: any) => infer R ? R : never,
  TForce
> extends infer Adjusted
  ? ExtractOverloadForForce<TOp, TForce> extends (params: infer P) => any
    ? (params: P) => Adjusted
    : never
  : never;

export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: Omit<GlobalConfig, 'forceValidation'> & { forceValidation: true }
): { [K in keyof TOperations]: BoundOperation<TOperations[K], true> };
export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: Omit<GlobalConfig, 'forceValidation'> & { forceValidation: false }
): { [K in keyof TOperations]: BoundOperation<TOperations[K], false> };
export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: Omit<GlobalConfig, 'forceValidation'>
): { [K in keyof TOperations]: BoundOperation<TOperations[K], false> };
export function configureOperations<TOperations extends Record<string, Operation>>(
  operations: TOperations,
  config: (Omit<GlobalConfig, 'forceValidation'> & { forceValidation: boolean }) | Omit<GlobalConfig, 'forceValidation'>
): { [K in keyof TOperations]: BoundOperation<TOperations[K], boolean> } {
  const bound: Partial<Record<keyof TOperations, (params: unknown) => unknown>> = {};
  for (const key in operations) {
    const op = operations[key];
    /* Preserve runtime guard (test expects the string below to appear) */
    if (typeof operations[key] === 'function') {
      bound[key] = (params: unknown) => {
        return (op as (...args: any[]) => unknown)(params, config);
      };
    }
  }
  /* Cast through satisfies to keep key mapping precise while avoiding any */
  return bound as { [K in keyof TOperations]: BoundOperation<TOperations[K], boolean> };
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
