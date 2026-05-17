import { describe, expect, it } from "vitest";
import * as z from "zod";

import { createMockOperationHandler } from "../generated/hono/mock-runtime.ts";
import {
  sendRouteResponse,
  type GeneratedOperationContext,
  type GeneratedRouteDefinition,
} from "../generated/hono/runtime.ts";
import { toHonoPath } from "../scripts/hono-generator/route-utils.js";

function createRoute(
  responseMap: GeneratedRouteDefinition["responseMap"],
): GeneratedRouteDefinition {
  return {
    operationId: "testRoute",
    requestMap: {},
    responseMap,
  };
}

function createUnusedContext<TRoute extends GeneratedRouteDefinition>() {
  return {} as GeneratedOperationContext<TRoute>;
}

describe("generated Hono mock runtime", () => {
  it("prefers structured JSON responses when multiple content types are declared", async () => {
    const route = createRoute({
      "200": {
        "application/problem+json; charset=utf-8": z.object({
          detail: z.string(),
        }),
        "text/plain; charset=utf-8": z.string(),
      },
    });

    const result = await createMockOperationHandler(route)(
      {},
      createUnusedContext<typeof route>(),
    );
    const response = sendRouteResponse(result);

    expect(result.contentType).toBe("application/problem+json; charset=utf-8");
    expect(response.headers.get("content-type")).toBe(
      "application/problem+json; charset=utf-8",
    );
    await expect(response.json()).resolves.toMatchObject({
      detail: expect.any(String),
    });
  });

  it("serializes unsupported structured content types as JSON", async () => {
    const route = createRoute({
      "200": {
        "application/xml": z.object({
          id: z.number(),
        }),
      },
    });

    const result = await createMockOperationHandler(route)(
      {},
      createUnusedContext<typeof route>(),
    );
    const response = sendRouteResponse(result);

    expect(result.contentType).toBe("application/xml");
    expect(response.headers.get("content-type")).toBe("application/json");
    await expect(response.json()).resolves.toMatchObject({
      id: expect.any(Number),
    });
  });
});

describe("toHonoPath", () => {
  it("rejects parameter names that collide after sanitization", () => {
    expect(() => {
      return toHonoPath("/pets/{pet-id}/owners/{pet_id}");
    }).toThrow(
      /\/pets\/\{pet-id\}\/owners\/\{pet_id\}.*"pet-id".*"pet_id".*sanitize to "pet_id".*Hono/i,
    );
  });

  it("stores parameter maps without a prototype", () => {
    const { paramNameMap } = toHonoPath("/pets/{__proto__}/{constructor}");

    expect(Object.getPrototypeOf(paramNameMap)).toBeNull();
    expect(paramNameMap["__proto__"]).toBe("__proto__");
    expect(paramNameMap.constructor).toBe("constructor");
  });
});
