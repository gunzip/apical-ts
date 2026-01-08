/* MSW adapter module for connecting generated OpenAPI server wrappers */

import { http, HttpResponse, type HttpHandler } from "msw";
import type { PathParams } from "msw";

/**
 * Standard response format from generated server wrappers
 */
export interface ServerResponse {
  status: string | "default";
  contentType?: string;
  data?: any;
}

/**
 * Extract parameters from MSW request for wrapper consumption
 */
export async function extractRequestParams(
  request: Request,
  params: PathParams,
) {
  const url = new URL(request.url);

  /* Extract query parameters */
  const query: Record<string, any> = {};
  url.searchParams.forEach((value, key) => {
    const existing = query[key];
    if (existing !== undefined) {
      /* Handle multiple values for same parameter - always use array */
      query[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      /* Check if there are multiple values for this key */
      const allValues = url.searchParams.getAll(key);
      /* Always use array if multiple values, or if the schema expects an array */
      query[key] = allValues.length > 1 ? allValues : value;
    }
  });

  /* Extract path parameters (already parsed by MSW) */
  const path: Record<string, any> = { ...params };

  /* Extract headers */
  const headers: Record<string, any> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  /* Extract body if present */
  let body: any = undefined;
  const contentType = request.headers.get("content-type");

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      if (contentType?.includes("application/json")) {
        body = await request.json();
      } else if (contentType?.includes("text/")) {
        body = await request.text();
      } else {
        /* Try to parse as JSON by default */
        const text = await request.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }
      }
    } catch {
      /* Body parsing failed, leave undefined */
    }
  }

  return {
    query,
    path,
    headers,
    body,
    contentType: contentType || undefined,
  };
}

/**
 * Adapter function that creates an MSW handler from a generated route wrapper
 * @param baseUrl - Optional base URL to prefix the path (e.g., "http://localhost:3001")
 */
export function createMswHandler<
  R extends {
    path: string;
    method: string;
    wrapper: (handler: any) => (req: any) => Promise<any>;
    operationId: string;
  },
>(
  routeInfo: R,
  handler: Parameters<R["wrapper"]>[0],
  baseUrl?: string,
): HttpHandler {
  /* Convert OpenAPI path to MSW path format (already uses :param syntax) */
  const mswPath = routeInfo.path.replace(/\{([^}]+)\}/g, ":$1");

  /* Add base URL if provided */
  const fullPath = baseUrl ? `${baseUrl}${mswPath}` : mswPath;

  /* Determine the HTTP method handler */
  const method = routeInfo.method.toLowerCase();
  const httpMethod = http[method as keyof typeof http];

  if (!httpMethod || typeof httpMethod !== "function") {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  return httpMethod(fullPath, async ({ request, params }) => {
    try {
      /* Extract and prepare request parameters */
      const requestParams = await extractRequestParams(request, params);

      /* Call the wrapped handler */
      const wrappedHandler = routeInfo.wrapper(handler);
      const result = await wrappedHandler(requestParams);

      /* Convert status to number */
      const httpStatus =
        typeof result.status === "number"
          ? result.status
          : parseInt(result.status, 10) || 500;

      /* Determine content type and prepare response */
      const contentType = result.contentType || "application/json";

      /* Create appropriate HttpResponse based on content type and data */
      if (result.data === null || result.data === undefined) {
        return new HttpResponse(null, {
          status: httpStatus,
          headers: {
            "Content-Type": contentType,
          },
        });
      }

      if (contentType.includes("application/json")) {
        return HttpResponse.json(result.data, {
          status: httpStatus,
          headers: {
            "Content-Type": contentType,
          },
        });
      }

      /* For other content types, send as text */
      return new HttpResponse(
        typeof result.data === "string"
          ? result.data
          : JSON.stringify(result.data),
        {
          status: httpStatus,
          headers: {
            "Content-Type": contentType,
          },
        },
      );
    } catch (error) {
      console.error(
        `Error in MSW handler for ${routeInfo.operationId}:`,
        error,
      );
      return HttpResponse.json(
        { error: "Internal server error", message: String(error) },
        { status: 500 },
      );
    }
  });
}
