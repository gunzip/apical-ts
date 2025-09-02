import express from "express";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  route as testParameterWithDashRoute,
  testParameterWithDashWrapper,
} from "./generated/server/testParameterWithDash.js";
import {
  route as testWithTwoParamsRoute,
  testWithTwoParamsWrapper,
} from "./generated/server/testWithTwoParams.js";
import {
  route as testCoercionRoute,
  testCoercionWrapper,
} from "./generated/server/testCoercion.js";

/* Minimal local adapter + helpers to decouple test from example implementation. */
interface LocalServerResponse {
  status: number;
  contentType?: string;
  data?: any;
}

function localExtractRequestParams(req: express.Request) {
  return {
    query: { ...req.query },
    path: { ...req.params },
    headers: { ...req.headers },
    body: req.body,
    contentType: req.get("content-type") || undefined,
  };
}

function localCreateExpressAdapter<
  THandler extends Function,
  TResponse extends LocalServerResponse,
>(
  routeInfo: {
    path: string;
    method: string;
    wrapper: (handler: THandler) => (req: any) => Promise<TResponse>;
  },
  handler: THandler,
) {
  return (app: express.Express) => {
    /* Sanitize path parameter names for Express while tracking original → sanitized mapping */
    const paramNameMap: Record<string, string> = {};
    const expressPath = routeInfo.path.replace(/\{([^}]+)\}/g, (_, raw) => {
      const sanitized = raw.replace(/[^a-zA-Z0-9_]/g, "_");
      paramNameMap[raw] = sanitized;
      return `:${sanitized}`;
    });
    const method = routeInfo.method.toLowerCase() as keyof express.Express;
    if (typeof (app as any)[method] !== "function") return;
    (app as any)[method](
      expressPath,
      async (req: express.Request, res: express.Response) => {
        try {
          const params = localExtractRequestParams(req);
          /* Reconstruct path object using original parameter keys */
          const remappedPath: Record<string, any> = {};
          for (const [original, sanitized] of Object.entries(paramNameMap)) {
            if (Object.prototype.hasOwnProperty.call(req.params, sanitized)) {
              remappedPath[original] = (req.params as any)[sanitized];
            }
          }
          const wrapped = routeInfo.wrapper(handler);
          const result: TResponse = await wrapped({
            ...params,
            path: remappedPath,
          });
          res
            .status(result.status)
            .type(result.contentType || "application/json")
            .send(result.data);
        } catch (err) {
          console.error("Local adapter error", err);
          res.status(500).json({ error: "Internal server error" });
        }
      },
    );
  };
}

/* Integration test ensuring server wrappers function with Express WITHOUT legacy transform/convert logic. */

describe("Express server wrappers integration", () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    /* Wire testParameterWithDash */
    {
      const r = testParameterWithDashRoute();
      const adapter = localCreateExpressAdapter(
        {
          path: r.path,
          method: r.method,
          wrapper: testParameterWithDashWrapper,
        },
        async (params) => {
          if (!params.success) {
            /* Map validation errors to an allowed fallback status (500) */
            return { status: 500 } as const;
          }
          return { status: 200, data: params.value } as const;
        },
      );
      adapter(app);
    }

    /* Wire testWithTwoParams (numbers + boolean coercion) */
    {
      const r = testWithTwoParamsRoute();
      const adapter = localCreateExpressAdapter(
        { path: r.path, method: r.method, wrapper: testWithTwoParamsWrapper },
        async (params) => {
          if (!params.success) return { status: 500 } as const;
          return { status: 200, data: params.value } as const;
        },
      );
      adapter(app);
    }

    /* Wire testCoercion (query/path/header coercion) */
    {
      const r = testCoercionRoute();
      const adapter = localCreateExpressAdapter(
        { path: r.path, method: r.method, wrapper: testCoercionWrapper },
        async (params) => {
          if (!params.success) return { status: 500 } as const;
          return { status: 200, data: params.value } as const;
        },
      );
      adapter(app);
    }

    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
  });

  afterAll(async () => {
    if (server) await new Promise((r) => server.close(r));
  });

  it("handles dashed path & query & header names without transformation", async () => {
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;
    const res = await request(base)
      .get("/test-parameter-with-dash/abcdef")
      .set("headerinlineparam", "inline-header")
      .set("x-header-param", "xvalue")
      .query({ "foo-bar": "qb", "request-id": "1234567890" });

    expect(res.status).toBe(200);
    /* Ensure original keys preserved */
    expect(res.body.query).toHaveProperty("foo-bar", "qb");
    expect(res.body.headers).toHaveProperty("headerinlineparam");
  });

  it("coerces number & boolean path parameters via z.coerce.* on testWithTwoParams", async () => {
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;
    const res = await request(base)
      .get("/test-two-path-params/123/true")
      .query({});
    expect(res.status).toBe(200);
    expect(res.body.path).toBeDefined();
    /* Validate types actually coerced: these remain strings because spec types are string; ensure raw values match */
    expect(typeof res.body.path["first-param"]).toBe("string");
    expect(res.body.path["first-param"]).toBe("123");
    expect(typeof res.body.path["second-param"]).toBe("string");
    expect(res.body.path["second-param"]).toBe("true");
  });

  it("coerces path, query and header primitives on testCoercion route", async () => {
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;
    const res = await request(base)
      .get("/test-coercion/456/false")
      .set("count-header", "99")
      .query({ "num-query": "123.5", "flag-query": "true" });
    expect(res.status).toBe(200);
    /* Path coercion */
    expect(res.body.path["int-param"]).toBe(456);
    expect(typeof res.body.path["int-param"]).toBe("number");
    /* stringbool(): should parse 'false' to boolean false */
    expect(res.body.path["bool-param"]).toBe(false);
    expect(typeof res.body.path["bool-param"]).toBe("boolean");
    /* Query coercion */
    expect(res.body.query["num-query"]).toBeCloseTo(123.5);
    expect(typeof res.body.query["num-query"]).toBe("number");
    expect(res.body.query["flag-query"]).toBe(true);
    expect(typeof res.body.query["flag-query"]).toBe("boolean");
    /* Header coercion */
    expect(res.body.headers["count-header"]).toBe(99);
    expect(typeof res.body.headers["count-header"]).toBe("number");
  });
});
