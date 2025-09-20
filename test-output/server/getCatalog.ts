import { GetCatalog200ResponseStrict } from "../schemas/GetCatalog200ResponseStrict.js";

import { z } from "zod";

export const getCatalogResponseMap = {
  "200": {
    "application/json": GetCatalog200ResponseStrict,
  },
} as const;
export type getCatalogResponseMap = typeof getCatalogResponseMap;

export type getCatalogResponse =
  | { status: 200; contentType: "application/json"; data: GetCatalog200ResponseStrict; };

const getCatalogQuerySchema = z.strictObject({ "url": z.url().optional(), "status": z.enum(["live", "archived"]).optional(), "collection": z.string().optional(), "q": z.string().optional() });
type getCatalogQuery = z.infer<typeof getCatalogQuerySchema>;
const getCatalogPathSchema = z.strictObject({});
type getCatalogPath = z.infer<typeof getCatalogPathSchema>;
const getCatalogHeadersSchema = z.object({});
type getCatalogHeaders = z.infer<typeof getCatalogHeadersSchema>;

type getCatalogValidationError =
  | { kind: "query-error"; error: z.ZodError; isValid: false }
  | { kind: "path-error"; error: z.ZodError; isValid: false }
  | { kind: "headers-error"; error: z.ZodError; isValid: false }
  | { kind: "body-error"; error: z.ZodError; isValid: false };

type getCatalogParsedParams = {
  query: getCatalogQuery;
  path: getCatalogPath;
  headers: getCatalogHeaders;
  body?: undefined;
};

export type getCatalogHandler = (
  params: { isValid: true; value: getCatalogParsedParams } | getCatalogValidationError,
) => Promise<getCatalogResponse>;

export function getCatalogWrapper(
  handler: getCatalogHandler,
) {
  return async (req: {
    query: unknown;
    path: unknown;
    headers: unknown;
    body?: unknown;
    contentType?: string;
  }): Promise<getCatalogResponse> => {
  const queryParse = getCatalogQuerySchema.safeParse(req.query);
  if (!queryParse.success) return handler({ kind: "query-error", error: queryParse.error, isValid: false });

  const pathParse = getCatalogPathSchema.safeParse(req.path);
  if (!pathParse.success) return handler({ kind: "path-error", error: pathParse.error, isValid: false });

  const headersParse = getCatalogHeadersSchema.safeParse(req.headers);
  if (!headersParse.success) return handler({ kind: "headers-error", error: headersParse.error, isValid: false });
  let parsedBody: undefined | undefined = undefined;
  return handler({
    isValid: true,
    value: {
      query: queryParse.data,
      path: pathParse.data,
      headers: headersParse.data,
      body: parsedBody
    },
  });
  };
}

export function route() {
  return {
    path: "/catalog",
    method: "get",
    wrapper: getCatalogWrapper,
    operationId: "getCatalog",
    requestMap: {},
    responseMap: getCatalogResponseMap,
  } as const;
}