/* Express adapter module for connecting generated OpenAPI server wrappers */

import type { Request, Response } from "express";

/**
 * Standard response format from generated server wrappers
 */
export interface ServerResponse {
  status: number;
  contentType?: string;
  data?: any;
}

/**
 * Extract parameters from Express request for wrapper consumption
 * Handles parameter name transformation from kebab-case to camelCase
 */
export function extractRequestParams(req: Request) {
  const query: Record<string, any> = { ...req.query };
  const path: Record<string, any> = { ...req.params };
  const headers: Record<string, any> = { ...req.headers };

  return {
    query,
    path,
    headers,
    body: req.body,
    contentType: req.get("content-type") || undefined,
  };
}

/**
 * Adapter function that connects a generated wrapper to Express
 * This simplifies the process of setting up routes
 */
export function createExpressAdapter<
  THandler extends Function,
  TResponse extends ServerResponse,
>(
  routeInfo: {
    path: string;
    method: string;
    wrapper: (handler: THandler) => (req: any) => Promise<TResponse>;
  },
  handler: THandler,
) {
  return (app: Express.Application) => {
    /* Build Express path replacing invalid param name chars with underscores while preserving mapping */
    const paramNameMap: Record<string, string> = {};
    const expressPath = routeInfo.path.replace(/\{([^}]+)\}/g, (_, raw) => {
      const sanitized = raw.replace(/[^a-zA-Z0-9_]/g, "_");
      paramNameMap[raw] = sanitized;
      return `:${sanitized}`;
    });
    const method = routeInfo.method.toLowerCase() as keyof typeof app;

    if (typeof app[method] === "function") {
      (app[method] as any)(expressPath, async (req: Request, res: Response) => {
        try {
          const params = extractRequestParams(req);
          /* Remap sanitized Express param names back to original OpenAPI keys */
          const remappedPath: Record<string, any> = {};
          for (const [original, sanitized] of Object.entries(paramNameMap)) {
            if (Object.prototype.hasOwnProperty.call(req.params, sanitized)) {
              remappedPath[original] = (req.params as any)[sanitized];
            }
          }
          const wrappedHandler = routeInfo.wrapper(handler);
          const result: TResponse = await wrappedHandler({
            ...params,
            path: remappedPath,
          });
          res
            .status(result.status)
            .type(result.contentType || "application/json")
            .send(result.data);
        } catch (error) {
          console.error("Error in route handler:", error);
          res.status(500).json({ error: "Internal server error" });
        }
      });
    }
  };
}
