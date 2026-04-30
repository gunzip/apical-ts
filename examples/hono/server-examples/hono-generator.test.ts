import { describe, expect, it } from "vitest";
import * as z from "zod";

import {
  createMockUsecase,
  sendRouteResponse,
  type MockRouteDefinition,
} from "../generated/hono/runtime.js";
import { toHonoPath } from "../scripts/hono-generator/route-utils.js";

function createRoute(
  responseMap: MockRouteDefinition["responseMap"],
): MockRouteDefinition {
  return {
    operationId: "testRoute",
    requestMap: {},
    responseMap,
  };
}

describe("generated Hono runtime", () => {
  it("prefers structured JSON responses when multiple content types are declared", async () => {
    const route = createRoute({
      "200": {
        "application/problem+json; charset=utf-8": z.object({
          detail: z.string(),
        }),
        "text/plain; charset=utf-8": z.string(),
      },
    });

    const result = await createMockUsecase(route)({});
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

    const result = await createMockUsecase(route)({});
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
