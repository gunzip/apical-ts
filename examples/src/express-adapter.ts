/* Express adapter module for connecting generated OpenAPI server wrappers */

import type { Request, Response } from "express";

/**
 * Extract parameters from Express request for wrapper consumption
 * Handles parameter name transformation from kebab-case to camelCase
 */
export function extractRequestParams(req: Request) {
  /* Transform query parameters from kebab-case to camelCase */
  const transformedQuery: Record<string, any> = {};
  for (const [key, value] of Object.entries(req.query)) {
    const transformedKey = transformParameterName(key);
    transformedQuery[transformedKey] = value;
  }

  /* Transform path parameters from kebab-case to camelCase */
  const transformedPath: Record<string, any> = {};
  for (const [key, value] of Object.entries(req.params)) {
    const transformedKey = transformParameterName(key);
    transformedPath[transformedKey] = value;
  }

  /* Transform header parameters */
  /* Express normalizes all headers to lowercase, so we need to handle this */
  const transformedHeaders: Record<string, any> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    /* Apply basic transformation */
    const transformedKey = transformParameterName(key);
    transformedHeaders[transformedKey] = value;
  }

  return {
    query: transformedQuery,
    path: transformedPath,
    headers: transformedHeaders,
    body: req.body,
    contentType: req.get("content-type") || undefined,
  };
}

/**
 * Transform parameter names from kebab-case to camelCase (matching sanitizeIdentifier logic)
 */
function transformParameterName(name: string): string {
  /* Handle special cases for headers that should preserve original format */
  if (name.startsWith("x-")) {
    return name; /* Keep x-headers as-is */
  }

  /* For headers that Express converts to lowercase, we need to handle both cases */
  if (name === name.toLowerCase() && !name.includes("-")) {
    /* This might be a header like "headerinlineparam" that should be "headerInlineParam" */
    /* For now, let's just return it as-is and see if it matches */
    return name;
  }

  /* Transform kebab-case to camelCase: foo-bar -> fooBar, path-param -> pathParam */
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Send response from wrapper result
 */
export function sendWrapperResponse(
  res: Response,
  result: { status: number; contentType: string; data: any },
) {
  res.status(result.status).type(result.contentType).send(result.data);
}

/**
 * Adapter function that connects a generated wrapper to Express
 * This simplifies the process of setting up routes
 */
export function createExpressAdapter<THandler extends Function>(
  wrapper: (handler: THandler) => (req: any) => Promise<any>,
  routeInfo: { path: string; method: string },
  handler: THandler,
) {
  return {
    path: routeInfo.path,
    method: routeInfo.method.toLowerCase(),
    handler: async (req: Request, res: Response) => {
      try {
        const params = extractRequestParams(req);
        const wrappedHandler = wrapper(handler);
        const result = await wrappedHandler(params);
        sendWrapperResponse(res, result);
      } catch (error) {
        console.error("Error in Express adapter:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  };
}