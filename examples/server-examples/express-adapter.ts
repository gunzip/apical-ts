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
    transformedPath[transformedKey] = convertPathParameter(value);
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
 * Convert path parameter values to appropriate types
 * Express always gives us strings, but OpenAPI schemas may expect numbers, booleans, etc.
 */
function convertPathParameter(value: string): any {
  /* Try to convert to number if it looks like a number */
  if (/^\d+$/.test(value)) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      return num;
    }
  }

  /* Try to convert to float if it looks like a float */
  if (/^\d+\.\d+$/.test(value)) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }
  }

  /* Convert boolean-like strings */
  if (value === "true") return true;
  if (value === "false") return false;

  /* Return as string for everything else */
  return value;
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
 * Adapter function that connects a generated wrapper to Express
 * This simplifies the process of setting up routes
 */
export function createExpressAdapter<THandler extends Function>(
  wrapper: (handler: THandler) => (req: any) => Promise<any>,
  routeInfo: { path: string; method: string },
  handler: THandler,
) {
  return (app: Express.Application) => {
    const expressPath = routeInfo.path.replace(
      /{([^}]+)}/g,
      ":$1",
    ); /* Convert {petId} to :petId */
    const method = routeInfo.method.toLowerCase() as keyof typeof app;

    if (typeof app[method] === "function") {
      (app[method] as any)(expressPath, async (req: Request, res: Response) => {
        try {
          const params = extractRequestParams(req);
          const wrappedHandler = wrapper(handler);
          const result = await wrappedHandler(params);
          res.status(result.status).type(result.contentType).send(result.data);
        } catch (error) {
          console.error("Error in route handler:", error);
          res.status(500).json({ error: "Internal server error" });
        }
      });
    }
  };
}
