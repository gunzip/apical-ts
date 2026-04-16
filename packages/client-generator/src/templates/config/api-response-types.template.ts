/* API response type definitions and parsing utilities */

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
}

/* Type-safe helper function that lets TypeScript infer the correct forced parse result type */
export function createForcedParseResponse<
  S extends string,
  TParseResult extends { contentType: string; parsed: unknown }
>(
  status: S,
  data: unknown,
  response: Response,
  parseResult: TParseResult
) {
  return {
    isValid: true as const,
    status,
    data,
    response,
    parsed: { data: parseResult.parsed, contentType: parseResult.contentType },
  };
}`;
}

/*
 * Renders the API response type definitions
 */
export function renderApiResponseTypes(): string {
  return `/**
 * Represents a generic API response for the new discriminated union pattern.
 * @template S The HTTP status code as a string (e.g., "200", "4XX", "default").
 */
export type ApiResponse<S extends string, T> =
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
  readonly status: string;
  readonly response: Response;
};

/*
 * Error type for operation failures
 * Represents all possible error conditions that can occur during an operation
 */
export type ApiResponseError = {
  readonly isValid: false;
  readonly status: undefined;
} & (
  | {
      readonly kind: "unexpected-error";
      readonly error: unknown;
    }
  | {
      readonly kind: "fetch-error";
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
  S extends string,
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
  S extends string,
  Map extends Record<string, Record<string, any>>,
> = {
  readonly isValid: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parsed: ${"`${S}`"} extends keyof Map
    ? {
        [K in keyof Map[${"`${S}`"}]]: {
          contentType: K;
          data: z.infer<Map[${"`${S}`"}][K]>;
        };
      }[keyof Map[${"`${S}`"}]]
    : never;
};`;
}
