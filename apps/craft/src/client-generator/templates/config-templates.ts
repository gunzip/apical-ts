/* Configuration file rendering templates */

import type { ConfigStructure } from "../models/config-models.js";

/*
 * Renders API response parsing utilities
 */
export function renderApiResponseParsingUtilities(): string {
  return `/* Overload without deserializers */
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

/* Overload with deserializers */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, { safeParse: (value: unknown) => z.ZodSafeParseResult<unknown> }>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
  deserializers: DeserializerMap,
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
  deserializers?: DeserializerMap,
) {
  const contentType = getResponseContentType(response);

  /* Apply custom deserializer if provided */
  let deserializedData = data;
  let deserializationError: unknown = undefined;

  if (deserializers && deserializers[contentType]) {
    try {
      deserializedData = deserializers[contentType](data, contentType);
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
}`;
}

/*
 * Renders the API response type definitions
 */
export function renderApiResponseTypes(): string {
  return `/**
 * Represents a generic API response for the new discriminated union pattern.
 * @template S The HTTP status code.
 */
export type ApiResponse<S extends number | "default", T> =
  | {
      readonly isValid: true;
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
  readonly isValid: false;
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
  S extends number | "default",
  Map extends Record<string, Record<string, any>>,
> = {
  readonly isValid: true;
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
  S extends number | "default",
  Map extends Record<string, Record<string, any>>,
> = {
  readonly isValid: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parsed: ${"`${S}`"} extends keyof Map
    ? z.infer<Map[${"`${S}`"}][keyof Map[${"`${S}`"}]]>
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
  forceValidation: true
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
  deserializers?: DeserializerMap;
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
    renderRequestBodyType(),
    "",
    renderUtilityFunctions(),
    "",
    renderOperationUtilities(),
  ].join("\n");
}

/*
 * Renders deserializer type definitions
 */
export function renderDeserializerTypes(): string {
  return `/* Type definitions for pluggable deserialization */
export type Deserializer = (data: unknown, contentType?: string) => unknown;
export type DeserializerMap = Record<string, Deserializer>;`;
}

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

/* Render RequestBody alias used across generated clients */
export function renderRequestBodyType(): string {
  return `/* Common request body union for generated clients */
export type RequestBody = string | Blob | ArrayBuffer | FormData | undefined;`;
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
  return raw ? raw.split(";")[0].trim().toLowerCase() : "";
}`;
}

/*
 * Renders utility functions for response handling
 */
export function renderUtilityFunctions(): string {
  return [
    renderFormDataUtilities(),
    "",
    renderResponseParsingUtilities(),
    "",
    renderDeserializerTypes(),
    "",
    renderApiResponseParsingUtilities(),
    "",
    renderFormUrlEncodeUtilities(),
  ].join("\n");
}
