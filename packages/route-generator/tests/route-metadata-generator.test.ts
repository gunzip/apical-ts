import { describe, expect, it } from "vitest";

import { generateRouteMetadata } from "../src/index.js";

describe("route metadata generator", () => {
  it("avoids response type name collisions with imported schemas", () => {
    const result = generateRouteMetadata(
      "/pets/{petId}",
      "get",
      {
        operationId: "petFindByStatus",
        parameters: [
          {
            in: "path",
            name: "petId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/petFindByStatusResponse",
                },
              },
            },
            description: "Success",
          },
        },
      },
      [],
      {
        components: {
          schemas: {
            petFindByStatusResponse: {
              properties: {
                id: { type: "string" },
              },
              type: "object",
            },
          },
        },
        openapi: "3.1.0",
        paths: {},
      },
    );

    expect(result.routeCode).toContain("petFindByStatusResponseMap");
    expect(result.routeCode).toContain(
      "export type petFindByStatusRouteResponse =",
    );
    expect(result.routeCode).not.toContain(
      "export type petFindByStatusResponse =",
    );
  });

  it("emits reusable response header schemas and route metadata maps", () => {
    const result = generateRouteMetadata(
      "/pets",
      "get",
      {
        operationId: "listPets",
        responses: {
          "200": {
            description: "Success",
            headers: {
              "X-Rate-Limit": {
                $ref: "#/components/headers/RateLimit",
              },
            },
          },
          "429": {
            description: "Too many requests",
            headers: {
              "X-Rate-Limit": {
                $ref: "#/components/headers/RateLimit",
              },
            },
          },
        },
      },
      [],
      {
        components: {
          headers: {
            RateLimit: {
              schema: {
                format: "int32",
                type: "integer",
              },
            },
          },
        },
        openapi: "3.1.0",
        paths: {},
      },
    );

    expect(result.routeCode).toContain(
      "export const listPetsResponseHeadersMap = {",
    );
    expect(
      result.routeCode.match(/RateLimitResponseHeaderSchema =/gu),
    ).toHaveLength(1);
    expect(result.routeCode).toContain(
      "responseHeadersMap: listPetsResponseHeadersMap",
    );
    expect(result.routeCode).toContain(
      'headers: listPetsRouteResponseHeadersForStatus<"200">;',
    );
  });
});
