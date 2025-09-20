import type { GlobalConfig, ApiResponse, ApiResponseError, ApiResponseWithParse, ApiResponseWithForcedParse } from "./config.js";
import { globalConfig, parseResponseBody, parseApiResponseUnknownData, createForcedParseResponse } from "./config.js";
import { z } from "zod";
import { GetCatalog200Response } from "../schemas/GetCatalog200Response.js";

/* Parameter schemas for type-safe inputs */
const getCatalogQuerySchema = z.object({ "url": z.url().optional(), "status": z.enum(["live", "archived"]).optional(), "collection": z.string().optional(), "q": z.string().optional() });
type getCatalogQuery = z.infer<typeof getCatalogQuerySchema>;
const getCatalogPathSchema = z.object({});
type getCatalogPath = z.infer<typeof getCatalogPathSchema>;
const getCatalogHeadersSchema = z.object({});
type getCatalogHeaders = z.infer<typeof getCatalogHeadersSchema>;

export const GetCatalogResponseMap = {
  "200": {
    "application/json": GetCatalog200Response,
  },
} as const;
export type GetCatalogResponseMap = {
  "200": {
    "application/json": GetCatalog200Response,
  },
};

export type GetCatalogResponseDeserializerMap = Partial<Record<{
  [Status in keyof typeof GetCatalogResponseMap]: keyof typeof GetCatalogResponseMap[Status]
}[keyof typeof GetCatalogResponseMap], import('./config.js').Deserializer>>;

export function getCatalog<TForceValidation extends boolean = true, TResponseContentType extends { [K in keyof GetCatalogResponseMap]: keyof GetCatalogResponseMap[K]; }[keyof GetCatalogResponseMap] = "application/json">(
  params: {
  query?: {
      "url"?: string;
      "status"?: string;
      "collection"?: string;
      "q"?: string;
    };
  contentType?: { response?: TResponseContentType };
},
  config: GlobalConfig & { deserializers?: GetCatalogResponseDeserializerMap } & { forceValidation: true }
): Promise<(true extends true ? ApiResponseWithForcedParse<200, typeof GetCatalogResponseMap> : ApiResponseWithParse<200, typeof GetCatalogResponseMap>) | ApiResponseError>;
export function getCatalog<TForceValidation extends boolean = true, TResponseContentType extends { [K in keyof GetCatalogResponseMap]: keyof GetCatalogResponseMap[K]; }[keyof GetCatalogResponseMap] = "application/json">(
  params: {
  query?: {
      "url"?: string;
      "status"?: string;
      "collection"?: string;
      "q"?: string;
    };
  contentType?: { response?: TResponseContentType };
},
  config: GlobalConfig & { deserializers?: GetCatalogResponseDeserializerMap } & { forceValidation: false }
): Promise<(false extends true ? ApiResponseWithForcedParse<200, typeof GetCatalogResponseMap> : ApiResponseWithParse<200, typeof GetCatalogResponseMap>) | ApiResponseError>;
export function getCatalog<TForceValidation extends boolean = true, TResponseContentType extends { [K in keyof GetCatalogResponseMap]: keyof GetCatalogResponseMap[K]; }[keyof GetCatalogResponseMap] = "application/json">(
  params: {
  query?: {
      "url"?: string;
      "status"?: string;
      "collection"?: string;
      "q"?: string;
    };
  contentType?: { response?: TResponseContentType };
},
  config?: GlobalConfig & { deserializers?: GetCatalogResponseDeserializerMap }
): Promise<(TForceValidation extends true ? ApiResponseWithForcedParse<200, typeof GetCatalogResponseMap> : ApiResponseWithParse<200, typeof GetCatalogResponseMap>) | ApiResponseError>;
export async function getCatalog<TForceValidation extends boolean = true, TResponseContentType extends { [K in keyof GetCatalogResponseMap]: keyof GetCatalogResponseMap[K]; }[keyof GetCatalogResponseMap] = "application/json">(
  params: {
  query?: {
      "url"?: string;
      "status"?: string;
      "collection"?: string;
      "q"?: string;
    };
  contentType?: { response?: TResponseContentType };
},
  config: GlobalConfig & { deserializers?: GetCatalogResponseDeserializerMap } = globalConfig
): Promise<(TForceValidation extends true ? ApiResponseWithForcedParse<200, typeof GetCatalogResponseMap> : ApiResponseWithParse<200, typeof GetCatalogResponseMap>) | ApiResponseError> {
    try {


    const finalHeaders: Record<string, string> = {
    ...config.headers,
    "Accept": params.contentType?.response || "application/json",
    };
    

    const url = new URL(`/catalog`, config.baseURL);
        if (params.query?.["url"] !== undefined) url.searchParams.append('url', String(params.query["url"]));
    if (params.query?.["status"] !== undefined) url.searchParams.append('status', String(params.query["status"]));
    if (params.query?.["collection"] !== undefined) url.searchParams.append('collection', String(params.query["collection"]));
    if (params.query?.["q"] !== undefined) url.searchParams.append('q', String(params.query["q"]));

    /* Inner try/catch for fetch-specific errors */
    let response: Response;
    let data: unknown;
    let minimalResponse: { status: number; headers: Map<string, string> };

    try {
      response = await config.fetch(url.toString(), {
        method: "GET",
        headers: finalHeaders,
      });

      /*
       * The response body is consumed immediately to prevent holding onto the raw
       * response stream. A new, lightweight response object is created with only
       * the necessary properties, and headers are copied to a Map to break the
       * reference to the original response object.
       */
      data = await parseResponseBody(response);
      minimalResponse = {
        status: response.status,
        headers: new Map(response.headers.entries()),
      };
    } catch (error) {
      return {
        isValid: false,
        kind: "fetch-error",
        error,
      } as const;
    }

    switch (response.status) {
    case 200: {

      if (config.forceValidation) {
        /* Force validation: automatically parse and return result */
        const parseResult = parseApiResponseUnknownData(minimalResponse, data, GetCatalogResponseMap["200"], config.deserializers ?? {});
        if ("parsed" in parseResult) {
          const forcedResult = createForcedParseResponse(200, data, response, parseResult);
          // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
          return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<200, typeof GetCatalogResponseMap> : ApiResponseWithParse<200, typeof GetCatalogResponseMap>);
        }
        if (parseResult.kind) {
          const errorResult = {
            ...parseResult,
            isValid: false as const,
            result: { data, status: 200, response },
          } satisfies ApiResponseError;
          return errorResult;
        }
        throw new Error("Invalid parse result");
      } else {
        /* Manual validation: provide parse method */
        const manualResult = {
          isValid: true as const,
          status: 200 as const,
          data,
          response,
          parse: () => parseApiResponseUnknownData(minimalResponse, data, GetCatalogResponseMap["200"], config.deserializers ?? {})
        } satisfies ApiResponseWithParse<200, typeof GetCatalogResponseMap>;
        return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<200, typeof GetCatalogResponseMap> : ApiResponseWithParse<200, typeof GetCatalogResponseMap>);
      }
    }
      default: {
        /* Return error for unexpected status codes instead of throwing */
        return {
          kind: "unexpected-response",
          isValid: false,
          result: {
            data,
            status: response.status,
            response,
          },
          error: `Unexpected response status: ${response.status}`,
        } as const;
      }
    }
  } catch (error) {
    return {
      isValid: false,
      kind: "unexpected-error",
      error,
    } as const;
  }
}