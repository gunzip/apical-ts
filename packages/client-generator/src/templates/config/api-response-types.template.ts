/* API response type definitions and parsing utilities */

/*
 * Renders API response parsing utilities
 */
export function renderApiResponseParsingUtilities(): string {
  return `type ParsedApiResponse<
  TSchemaMap extends Record<string, StandardSchemaV1>
> = {
  [K in keyof TSchemaMap]: {
    contentType: K;
    parsed: StandardSchemaV1.InferOutput<TSchemaMap[K]>;
  };
}[keyof TSchemaMap];

type ApiResponseParseFailure =
  | { kind: "parse-error"; error: StandardSchemaValidationError }
  | { kind: "missing-schema"; error: string }
  | { kind: "deserialization-error"; error: unknown };

type ApiResponseParseResult<
  TSchemaMap extends Record<string, StandardSchemaV1>
> = ParsedApiResponse<TSchemaMap> | ApiResponseParseFailure;

type SchemaEntry<TSchemaMap extends Record<string, StandardSchemaV1>> = {
  [K in keyof TSchemaMap]: {
    contentType: K;
    schema: TSchemaMap[K];
  };
}[keyof TSchemaMap];

function getSchemaEntry<TSchemaMap extends Record<string, StandardSchemaV1>>(
  schemaMap: TSchemaMap,
  contentType: string,
): SchemaEntry<TSchemaMap> | undefined {
  if (!Object.prototype.hasOwnProperty.call(schemaMap, contentType)) {
    return undefined;
  }

  const typedContentType = contentType as keyof TSchemaMap;
  const schema = schemaMap[typedContentType];
  if (!schema) {
    return undefined;
  }

  return {
    contentType: typedContentType,
    schema,
  } as SchemaEntry<TSchemaMap>;
}

function createParsedApiResponse<
  TSchemaMap extends Record<string, StandardSchemaV1>,
  TContentType extends keyof TSchemaMap,
>(
  contentType: TContentType,
  parsed: StandardSchemaV1.InferOutput<TSchemaMap[TContentType]>,
): ParsedApiResponse<TSchemaMap> {
  return {
    contentType,
    parsed,
  } as ParsedApiResponse<TSchemaMap>;
}

/* Overload without deserializers */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, StandardSchemaV1>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
): Promise<ApiResponseParseResult<TSchemaMap>>;

/* Overload with deserializers */
export function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, StandardSchemaV1>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
  deserializers: DeserializerMap,
): Promise<ApiResponseParseResult<TSchemaMap>>;

/* Implementation */
export async function parseApiResponseUnknownData<
  TSchemaMap extends Record<string, StandardSchemaV1>
>(
  response: MinimalResponse,
  data: unknown,
  schemaMap: TSchemaMap,
  deserializers?: DeserializerMap,
): Promise<ApiResponseParseResult<TSchemaMap>> {
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

  const schemaEntry = getSchemaEntry(schemaMap, contentType);
  if (!schemaEntry) {
    if (deserializationError) {
      return { kind: "deserialization-error", error: deserializationError } as const;
    }
    return { kind: "missing-schema", error: \`No schema found for content-type: \${contentType}\` } as const;
  }

  /* Only proceed with validation if deserialization succeeded */
  if (deserializationError) {
    return { kind: "deserialization-error", error: deserializationError } as const;
  }

  const result = await validateStandardSchema(schemaEntry.schema, deserializedData);
  if (result.success) {
    return createParsedApiResponse(schemaEntry.contentType, result.value);
  }
  return { kind: "parse-error", error: result.error } as const;
}

/* Type guard helpers for narrowing parse() results */
export function isParsed<
  T extends
    | { contentType: string; parsed: unknown }
    | { kind: "parse-error"; error: StandardSchemaValidationError }
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
      readonly error: StandardSchemaValidationError;
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
  Map extends Record<string, Record<string, StandardSchemaV1>>,
  Status extends keyof Map
> = Map[Status][keyof Map[Status]];

export type ExtractResponseUnion<
  TResponseMap,
  TStatus extends keyof TResponseMap,
> =
  TResponseMap[TStatus] extends Record<
    string,
    infer TSchema extends StandardSchemaV1
  >
    ? StandardSchemaV1.InferOutput<TSchema>
    : never;

/*
 * Precise ApiResponse type with always-present, type-safe parse function
 * Used when response map information is available for type-safe parsing
 */
export type ApiResponseWithParse<
  S extends string,
  Map extends Record<string, Record<string, StandardSchemaV1>>,
> = {
  readonly isValid: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parse: () => Promise<${"`${S}`"} extends keyof Map
    ?
        | {
            [K in keyof Map[${"`${S}`"}]]: {
              contentType: K;
              /* Narrow parsed type to the specific schema for this content type */
              parsed: StandardSchemaV1.InferOutput<Map[${"`${S}`"}][K]>;
            };
          }[keyof Map[${"`${S}`"}]]
  | { kind: "parse-error"; error: StandardSchemaValidationError }
  | { kind: "missing-schema"; error: string }
  | { kind: "deserialization-error"; error: unknown }
    : never>;
};

/*
 * Precise ApiResponse type with forced validation and always-present parsed field
 * Used when forceValidation flag is enabled for automatic response validation
 */
export type ApiResponseWithForcedParse<
  S extends string,
  Map extends Record<string, Record<string, StandardSchemaV1>>,
> = {
  readonly isValid: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parsed: ${"`${S}`"} extends keyof Map
    ? {
        [K in keyof Map[${"`${S}`"}]]: {
          contentType: K;
          data: StandardSchemaV1.InferOutput<Map[${"`${S}`"}][K]>;
        };
      }[keyof Map[${"`${S}`"}]]
    : never;
};`;
}
