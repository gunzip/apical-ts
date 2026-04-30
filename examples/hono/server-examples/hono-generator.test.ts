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
        "application/problem+json": z.object({
          detail: z.string(),
        }),
        "text/plain": z.string(),
      },
    });

    const result = await createMockUsecase(route)({});
    const response = sendRouteResponse(result);

    expect(result.contentType).toBe("application/problem+json");
    expect(response.headers.get("content-type")).toBe(
      "application/problem+json",
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
      'Route path "/pets/{pet-id}/owners/{pet_id}" contains parameter names "pet-id" and "pet_id" that both sanitize to "pet_id" for Hono.',
    );
  });
});
